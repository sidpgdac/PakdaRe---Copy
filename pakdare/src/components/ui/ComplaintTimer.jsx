import { useState, useEffect } from 'react';
import { SLA_HOURS } from '../../data/wardData';
import { motion } from 'framer-motion';

export default function ComplaintTimer({ complaint }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (complaint.resolved) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [complaint.resolved]);

  const start = new Date(complaint.time).getTime();
  const end = complaint.resolved ? new Date(complaint.resolvedAt || now).getTime() : now;
  const elapsedMs = end - start;
  
  const slaHrs = SLA_HOURS[complaint.severity] || 48;
  const slaMs = slaHrs * 3600000;
  
  const remainingMs = Math.max(0, slaMs - elapsedMs);
  const pct = Math.min(100, (elapsedMs / slaMs) * 100);
  
  let statusClass = 'timer-ok';
  let icon = '⏱️';
  if (remainingMs === 0) {
    statusClass = 'timer-breach';
    icon = '🚨';
  } else if (pct >= 75) {
    statusClass = 'timer-warn';
    icon = '⚠️';
  }

  const formatMs = (ms) => {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${s}s`;
  };

  if (complaint.resolved) {
    return (
      <div className="live-timer" style={{ background: 'rgba(16,185,129,0.1)' }}>
        <div className="live-timer-content" style={{ color: 'var(--green)' }}>
          <span>✅ Resolved in:</span>
          <span>{formatMs(elapsedMs)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="live-timer">
      <div 
        className="live-timer-bg" 
        style={{ 
          width: `${pct}%`,
          backgroundColor: statusClass === 'timer-breach' ? 'rgba(239,68,68,0.2)' : 
                           statusClass === 'timer-warn' ? 'rgba(245,158,11,0.2)' : 
                           'rgba(59,130,246,0.2)'
        }} 
      />
      <div className={`live-timer-content ${statusClass}`}>
        <span>{icon} {statusClass === 'timer-breach' ? 'SLA Breached by' : 'SLA Remaining'}</span>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>
          {statusClass === 'timer-breach' ? `-${formatMs(elapsedMs - slaMs)}` : formatMs(remainingMs)}
        </span>
      </div>
    </div>
  );
}
