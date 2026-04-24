import { useState, useCallback, useEffect, useRef } from 'react';
import { DEMO_COMPLAINTS } from '../data/demoData';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
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

export function useComplaints(mode) {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null); // null | string
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const fetchComplaints = useCallback(async () => {
    if (!isMountedRef.current) return;
    setLoading(true);
    setFetchError(null);

    if (mode === 'real' && supabase) {
      // Exclude photo blob columns from list query — they're large base64 strings
      // that cause statement timeouts. Photos are fetched on-demand via fetchComplaintDetail.
      const LIST_COLS = 'id,ward,location,lat,lng,category,severity,desc,status,assignedTo,time,resolved,isDemo,escalations,hierarchy,resolvedAt,resolutionOfficer,resolutionGps,gpsVerified';
      const { data, error } = await runQuery(() =>
        supabase
          .from('complaints')
          .select(LIST_COLS)
          .limit(500)
      );

      if (!isMountedRef.current) return;

      if (!error && data) {
        // sort newest-first client-side so the DB query stays index-free
        const sorted = [...data].sort((a, b) => new Date(b.time) - new Date(a.time));
        setComplaints(sorted);
      } else {
        // Surface the real Supabase error message so the user knows what to fix
        const msg = error?.message ?? 'Unknown error — check browser console for details.';
        console.error('[PakdaRe] Supabase fetch failed:', msg, error);
        setFetchError(msg);
        // Fall back to demo data so the app still works
        setComplaints(DEMO_COMPLAINTS);
      }
    } else {
      // Demo mode — use local data immediately
      if (isMountedRef.current) setComplaints(DEMO_COMPLAINTS);
    }

    if (isMountedRef.current) setLoading(false);
  }, [mode]);

  // Fetch on mount and when auth / mode changes
  useEffect(() => {
    fetchComplaints();
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
    setComplaints(prev => [c, ...prev]);
    if (mode === 'real' && supabase) {
      const { error } = await supabase.from('complaints').insert(c);
      if (error) console.error('[PakdaRe] addComplaint:', error.message);
    }
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
      resolutionPhoto: photoDataUrl,
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
    complaints, loading, fetchError,
    addComplaint, resolveComplaint, resolveWithPhoto,
    updateComplaint, seedDemo, clearDemo,
    fetchComplaintDetail, refetch: fetchComplaints,
  };
}
