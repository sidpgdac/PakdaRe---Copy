import { useState, useCallback, useEffect, useRef } from 'react';
import { DEMO_COMPLAINTS } from '../data/demoData';
import { useAuth } from '../context/AuthContext';
import { uploadComplaintPhotos, uploadResolutionPhoto } from '../utils/photoStorage';
import exifr from 'exifr';
import * as turf from '@turf/turf';
import api from '../api/axios';

const PAGE_SIZE = 50;

export function useComplaints(mode) {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null); 
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const fetchComplaints = useCallback(async (pageNum = 0, append = false) => {
    if (!isMountedRef.current) return;
    setLoading(true);
    setFetchError(null);

    if (mode === 'real') {
      try {
        const offset = pageNum * PAGE_SIZE;
        const res = await api.get(`/complaints?offset=${offset}&limit=${PAGE_SIZE}`);
        const data = res.data.data;
        const serverHasMore = res.data.hasMore ?? (data.length === PAGE_SIZE);

        if (!isMountedRef.current) return;

        setIsDemoMode(false);
        setHasMore(serverHasMore);  // use server truth, not a guess
        setPage(pageNum);
        if (append) {
          setComplaints(prev => {
            const ids = new Set(prev.map(c => c.id));
            return [...prev, ...data.filter(c => !ids.has(c.id))];
          });
        } else {
          setComplaints(data);
        }
      } catch (error) {
        const msg = error.response?.data?.message || error.message;
        console.error('[PakdaRe] Backend fetch failed:', msg);
        setFetchError(msg);
        setIsDemoMode(true);
        setComplaints(DEMO_COMPLAINTS);
      }
    } else {
      if (isMountedRef.current) {
        setIsDemoMode(true);
        setComplaints(DEMO_COMPLAINTS);
        setHasMore(false);
      }
    }

    if (isMountedRef.current) setLoading(false);
  }, [mode]);

  const loadMore = useCallback(() => {
    if (!hasMore || loading) return;
    fetchComplaints(page + 1, true);
  }, [hasMore, loading, page, fetchComplaints]);

  useEffect(() => {
    fetchComplaints(0, false);
  }, [fetchComplaints, user?.id]);

  // Real-time is currently disabled as we migrated off Supabase DB.
  // Next phase: Implement Socket.io for Node.js real-time updates.
  useEffect(() => {}, []);

  const dataURLtoBlob = (dataurl) => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  const addComplaint = useCallback(async (c) => {
    setComplaints(prev => [c, ...prev]);
    if (mode === 'real') {
      try {
        const formData = new FormData();
        
        // Append all text fields
        Object.keys(c).forEach(key => {
          if (key !== 'photos') {
            // Handle objects like location or complex types if any
            formData.append(key, typeof c[key] === 'object' ? JSON.stringify(c[key]) : c[key]);
          }
        });

        // Append photos
        if (c.photos && c.photos.length > 0) {
          c.photos.forEach((photo, index) => {
            if (typeof photo === 'string' && photo.startsWith('data:image')) {
              formData.append('photos', dataURLtoBlob(photo), `photo_${index}.jpg`);
            } else if (photo instanceof Blob || photo instanceof File) {
              formData.append('photos', photo, `photo_${index}.jpg`);
            }
          });
        }

        await api.post('/complaints', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } catch (error) {
        console.error('[PakdaRe] addComplaint error:', error);
        setComplaints(prev => prev.filter(x => x.id !== c.id));
        return { ok: false, error: error.message };
      }
    }
    return { ok: true };
  }, [mode]);

  const resolveWithPhoto = useCallback(async (id, photoDataUrl, officerName) => {
    const complaint = complaints.find(c => c.id === id);
    if (!complaint) return { ok: false, error: 'Complaint not found' };

    let resGps = null;
    try {
      const exifData = await exifr.gps(photoDataUrl);
      if (exifData?.latitude && exifData?.longitude) {
        resGps = { lat: exifData.latitude, lng: exifData.longitude };
      }
    } catch (_) {}

    if (resGps && complaint.lat && complaint.lng) {
      const from = turf.point([complaint.lng, complaint.lat]);
      const to   = turf.point([resGps.lng, resGps.lat]);
      const dist = turf.distance(from, to, { units: 'meters' });
      if (dist > 150) {
        return {
          ok: false,
          error: `GPS mismatch — you are ${Math.round(dist)}m away. Must be within 150m.`,
        };
      }
    }

    const resolvedAt = new Date().toISOString();

    const update = {
      resolved: true, status: 'Resolved', resolvedAt,
      resolutionOfficer: officerName || 'Officer',
      resolutionGps: resGps ? JSON.stringify(resGps) : null,
      gpsVerified: !!(resGps && complaint.lat),
    };

    setComplaints(prev => prev.map(c => c.id === id ? { ...c, ...update, resolutionPhoto: photoDataUrl } : c));
    
    if (mode === 'real') {
      try {
        const formData = new FormData();
        Object.keys(update).forEach(key => {
          if (update[key] !== null) formData.append(key, update[key]);
        });

        if (photoDataUrl) {
          if (typeof photoDataUrl === 'string' && photoDataUrl.startsWith('data:image')) {
            formData.append('resolutionPhoto', dataURLtoBlob(photoDataUrl), 'resolution.jpg');
          } else {
            formData.append('resolutionPhoto', photoDataUrl, 'resolution.jpg');
          }
        }

        await api.put(`/complaints/${id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } catch (error) {
        console.error('Update failed', error);
      }
    }
    return { ok: true };
  }, [complaints, mode]);

  const resolveComplaint = useCallback(async (id) => {
    setComplaints(prev =>
      prev.map(c => c.id === id ? { ...c, resolved: true, status: 'Resolved' } : c)
    );
    if (mode === 'real') {
      try {
        await api.put(`/complaints/${id}`, { resolved: true, status: 'Resolved' });
      } catch (error) {
        console.error('Resolve failed', error);
      }
    }
  }, [mode]);

  const updateComplaint = useCallback((id, patch) => {
    setComplaints(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
  }, []);

  const seedDemo = useCallback(async () => {
    if (mode === 'real') {
      try {
        await api.post('/complaints/seed', DEMO_COMPLAINTS);
        fetchComplaints();
      } catch (error) {
        console.error('Seed failed', error);
      }
    } else {
      setComplaints(DEMO_COMPLAINTS);
    }
  }, [mode, fetchComplaints]);

  const clearDemo = useCallback(async () => {
    if (mode === 'real') return;
    setComplaints([]);
  }, [mode]);

  const fetchComplaintDetail = useCallback(async (id) => {
    if (mode !== 'real') {
      return DEMO_COMPLAINTS.find(c => c.id === id) || complaints.find(c => c.id === id) || null;
    }
    try {
      const res = await api.get(`/complaints/${id}`);
      return res.data.data || complaints.find(c => c.id === id) || null;
    } catch (error) {
      return complaints.find(c => c.id === id) || null;
    }
  }, [mode, complaints]);

  return {
    complaints, loading, fetchError, isDemoMode,
    hasMore, loadMore,
    addComplaint, resolveComplaint, resolveWithPhoto,
    updateComplaint, seedDemo, clearDemo,
    fetchComplaintDetail, refetch: () => fetchComplaints(0, false),
  };
}
