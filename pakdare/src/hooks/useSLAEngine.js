import { useEffect, useCallback, useRef } from 'react';
import { SLA_HOURS } from '../data/wardData';

/**
 * SLA Engine — runs every 60 seconds client-side.
 * For each unresolved complaint it checks hours elapsed vs SLA threshold.
 * Returns: { getSLAInfo, getBreachedComplaints }
 */
export function useSLAEngine({ complaints, onBreach, updateComplaint }) {
  const notifiedRefs = useRef(new Set());

  // Calculate SLA info for a single complaint
  const getSLAInfo = useCallback((complaint) => {
    if (complaint.resolved) return { status: 'resolved', pct: 100, remaining: 0, label: 'Resolved' };

    const hours = SLA_HOURS[complaint.severity] || 48;
    const elapsed = (Date.now() - new Date(complaint.time).getTime()) / 3600000;
    const remaining = Math.max(0, hours - elapsed);
    const pct = Math.min(100, (elapsed / hours) * 100);

    let status = 'ok';
    if (remaining === 0) status = 'breached';
    else if (pct >= 75) status = 'warning';

    const fmt = (h) => {
      if (h <= 0) return 'Overdue';
      if (h < 1) return `${Math.round(h * 60)}m`;
      return `${Math.floor(h)}h ${Math.round((h % 1) * 60)}m`;
    };

    return { status, pct, remaining, label: fmt(remaining), slaHours: hours };
  }, []);

  // Get all breached complaints
  const getBreachedComplaints = useCallback(() => {
    return complaints.filter(c => !c.resolved && getSLAInfo(c).status === 'breached');
  }, [complaints, getSLAInfo]);

  // Auto-run every 60s
  useEffect(() => {
    const check = () => {
      const breached = complaints.filter(c => {
        if (c.resolved || c.slaBreachNotified || notifiedRefs.current.has(c.id)) return false;
        return getSLAInfo(c).status === 'breached';
      });
      breached.forEach(c => {
        notifiedRefs.current.add(c.id);
        onBreach?.(c);
        updateComplaint?.(c.id, { slaBreachNotified: true });
      });
    };

    check(); // run immediately
    const timer = setInterval(check, 60000);
    return () => clearInterval(timer);
  }, [complaints, getSLAInfo, onBreach, updateComplaint]);

  return { getSLAInfo, getBreachedComplaints };
}

// Helper: SLA countdown color
export function slaColor(status) {
  if (status === 'breached') return 'var(--red)';
  if (status === 'warning')  return 'var(--orange)';
  return 'var(--green)';
}
