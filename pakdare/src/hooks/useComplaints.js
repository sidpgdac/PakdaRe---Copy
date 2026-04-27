import { useState, useCallback, useEffect, useRef } from 'react';
import { DEMO_COMPLAINTS } from '../data/demoData';
import { supabase } from '../supabase';
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

        if (!isMountedRef.current) return;

        setIsDemoMode(false);
        setHasMore(data.length === PAGE_SIZE);
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

  const addComplaint = useCallback(async (c) => {
    setComplaints(prev => [c, ...prev]);
    if (mode === 'real') {
      // Still using Supabase Storage for photos to avoid DB bloat!
      const uploadedPhotos = await uploadComplaintPhotos(c.photos || [], c.id);
      const payload = { ...c, photos: uploadedPhotos };

      try {
        await api.post('/complaints', payload);
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

    // Upload resolution photo to Supabase Storage (not base64 in DB)
    const storedPhotoUrl = await uploadResolutionPhoto(photoDataUrl, id);

    const update = {
      resolved: true, status: 'Resolved', resolvedAt,
      resolutionPhoto: storedPhotoUrl,
      resolutionOfficer: officerName || 'Officer',
      resolutionGps: resGps,
      gpsVerified: !!(resGps && complaint.lat),
    };

    setComplaints(prev => prev.map(c => c.id === id ? { ...c, ...update } : c));
    if (mode === 'real') {
      try {
        await api.put(`/complaints/${id}`, update);
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
