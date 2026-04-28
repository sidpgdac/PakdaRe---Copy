import { useState, useCallback, useEffect, useRef } from 'react';
import { DEMO_COMPLAINTS } from '../data/demoData';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { uploadComplaintPhotos, uploadResolutionPhoto } from '../utils/photoStorage';
import exifr from 'exifr';
import * as turf from '@turf/turf';

// Wraps a Supabase query promise with a hard timeout.
// Returns { data, error } in all cases — never throws.
async function runQuery(queryFn, timeoutMs = 15000) {
  try {
    const result = await Promise.race([
      queryFn(),
      new Promise(resolve =>
        setTimeout(
          () => resolve({ data: null, error: { message: `Request timed out after ${timeoutMs / 1000}s. Check your Supabase project is not paused.` } }),
          timeoutMs
        )
      ),
    ]);
    return result;
  } catch (e) {
    return { data: null, error: { message: e.message || String(e) } };
  }
}

const PAGE_SIZE = 1048;

export function useComplaints(mode) {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null); // null | string
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

    if (mode === 'real' && supabase) {
      const LIST_COLS = 'id,ward,location,lat,lng,category,severity,desc,status,assignedTo,time,resolved,isDemo,escalations,hierarchy,photos,resolvedAt,resolutionOfficer,resolutionGps,gpsVerified';
      
      const from = pageNum * 1048;
      const to   = from + 1048 - 1;
      const { data, error } = await runQuery(() =>
        supabase
          .from('complaints')
          .select(LIST_COLS)
          .order('time', { ascending: false })
          .range(from, to)
      );

      if (!isMountedRef.current) return;

      if (!error && data) {
        setIsDemoMode(false);
        setHasMore(data.length === 1048);
        setPage(pageNum);
        if (append) {
          setComplaints(prev => {
            const ids = new Set(prev.map(c => c.id));
            return [...prev, ...data.filter(c => !ids.has(c.id))];
          });
        } else {
          setComplaints(data);
        }
      } else {
        const msg = error?.message ?? 'Unknown error — check browser console for details.';
        console.error('[PakdaRe] Supabase fetch failed:', msg, error);
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

  // Fetch on mount and when auth / mode changes
  useEffect(() => {
    fetchComplaints(0, false);
  }, [fetchComplaints, user?.id]);

  // Real-time subscription
  useEffect(() => {
    if (mode !== 'real' || !supabase) return;

    const channel = supabase
      .channel('realtime-complaints')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'complaints' },
        (payload) => {
          if (!isMountedRef.current) return;
          if (payload.eventType === 'INSERT') {
            setComplaints(prev => {
              const exists = prev.some(x => x.id === payload.new.id);
              return exists ? prev : [payload.new, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            setComplaints(prev =>
              prev.map(c => (c.id === payload.new.id ? payload.new : c))
            );
          } else if (payload.eventType === 'DELETE') {
            setComplaints(prev => prev.filter(c => c.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [mode]);

  const addComplaint = useCallback(async (c) => {
    // Optimistic update — add locally first for instant feedback
    setComplaints(prev => [c, ...prev]);
    if (mode === 'real' && supabase) {
      // Upload photos to Supabase Storage (prevents base64 bloat in DB)
      const uploadedPhotos = await uploadComplaintPhotos(c.photos || [], c.id);
      const payload = { ...c, photos: uploadedPhotos };

      const { error } = await supabase.from('complaints').insert(payload);
      if (error) {
        console.error('[PakdaRe] addComplaint error:', error);
        // Roll back the optimistic update on DB failure
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
    if (mode === 'real' && supabase) {
      await supabase.from('complaints').update(update).eq('id', id);
    }
    return { ok: true };
  }, [complaints, mode]);

  const resolveComplaint = useCallback(async (id) => {
    setComplaints(prev =>
      prev.map(c => c.id === id ? { ...c, resolved: true, status: 'Resolved' } : c)
    );
    if (mode === 'real' && supabase) {
      await supabase.from('complaints').update({ resolved: true, status: 'Resolved' }).eq('id', id);
    }
  }, [mode]);

  const updateComplaint = useCallback((id, patch) => {
    setComplaints(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
  }, []);

  const seedDemo = useCallback(async () => {
    if (mode === 'real' && supabase) {
      const { data } = await supabase.from('complaints').select('id');
      const existingIds = new Set((data || []).map(d => d.id));
      const newItems = DEMO_COMPLAINTS.filter(c => !existingIds.has(c.id));
      if (newItems.length > 0) await supabase.from('complaints').insert(newItems);
      fetchComplaints();
    } else {
      setComplaints(DEMO_COMPLAINTS);
    }
  }, [mode, fetchComplaints]);

  const clearDemo = useCallback(async () => {
    if (mode === 'real') return;
    setComplaints([]);
  }, [mode]);

  const fetchComplaintDetail = useCallback(async (id) => {
    if (mode !== 'real' || !supabase) {
      return DEMO_COMPLAINTS.find(c => c.id === id) || complaints.find(c => c.id === id) || null;
    }
    const { data } = await supabase.from('complaints').select('*').eq('id', id).single();
    return data || complaints.find(c => c.id === id) || null;
  }, [mode, complaints]);

  return {
    complaints, loading, fetchError, isDemoMode,
    hasMore, loadMore,
    addComplaint, resolveComplaint, resolveWithPhoto,
    updateComplaint, seedDemo, clearDemo,
    fetchComplaintDetail, refetch: () => fetchComplaints(0, false),
  };
}
