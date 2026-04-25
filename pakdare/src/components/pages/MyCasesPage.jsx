import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { CATEGORIES } from '../../data/wardData';
import { timeAgo } from '../../utils/dateHelper';

export default function MyCasesPage({ complaints, onDetail, getSLAInfo }) {
  const { user, staffProfile } = useAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');

  const officerName  = staffProfile?.name || user?.email?.split('@')[0] || 'Officer';
  const designation  = staffProfile?.designation || 'Field Officer';
  const wardId       = staffProfile?.ward_id;

  // Match complaints to this officer by ward or assignedTo name
  const myCases = useMemo(() => {
    const name = officerName.toLowerCase();
    return complaints.filter(c => {
      if (wardId && c.ward === wardId) return true;
      const a = (c.assignedTo || '').toLowerCase();
      return a.includes(name);
    });
  }, [complaints, officerName, wardId]);

  const filtered = useMemo(() => {
    if (filter === 'pending')  return myCases.filter(c => !c.resolved);
    if (filter === 'resolved') return myCases.filter(c => c.resolved);
    if (filter === 'critical') return myCases.filter(c => c.severity === 'critical' && !c.resolved);
    return myCases;
  }, [myCases, filter]);

  const stats = useMemo(() => {
    const total    = myCases.length;
    const resolved = myCases.filter(c => c.resolved).length;
    const pending  = myCases.filter(c => !c.resolved).length;
    const critical = myCases.filter(c => c.severity === 'critical' && !c.resolved).length;
    const resRate  = total ? Math.round((resolved / total) * 100) : 0;
    return { total, resolved, pending, critical, resRate };
  }, [myCases]);

  // Performance score: resolution rate + speed + low critical
  const performanceScore = useMemo(() => {
    if (!myCases.length) return 0;
    const resScore = stats.resRate;
    const resolvedWithTime = myCases.filter(c => c.resolved && c.resolvedAt && c.time);
    const speedScore = resolvedWithTime.length
      ? resolvedWithTime.reduce((acc, c) => {
          const hrs = (new Date(c.resolvedAt) - new Date(c.time)) / 3600000;
          return acc + Math.max(0, 100 - hrs * 2);
        }, 0) / resolvedWithTime.length
      : 50;
    const critScore = Math.max(0, 100 - stats.critical * 20);
    return Math.min(100, Math.round(resScore * 0.5 + speedScore * 0.3 + critScore * 0.2));
  }, [myCases, stats]);

  const scoreColor = performanceScore >= 70
    ? 'var(--green2)' : performanceScore >= 40
    ? 'var(--orange2)' : 'var(--red2)';

  return (
    <div className="page">
      <div className="page-hdr">
        <div className="page-hdr-row">
          <div>
            <h1 className="page-title">My Cases</h1>
            <p className="page-sub">{designation}{wardId ? ` · Ward ${wardId}` : ''}</p>
          </div>
          <button
            className="bp"
            onClick={() => navigate('/report', { state: { asOfficer: true } })}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            ➕ Officer Report
          </button>
        </div>
      </div>

      {/* Officer Profile Card */}
      <div className="officer-card">
        <div className="officer-avatar-lg">{officerName.slice(0, 2).toUpperCase()}</div>
        <div className="officer-card-info">
          <div className="officer-card-name">{officerName}</div>
          <div className="officer-card-role">{designation}</div>
          {wardId && <div className="officer-card-ward">📍 Ward {wardId}</div>}
        </div>
        <div className="officer-perf-wrap">
          <div className="officer-perf-score" style={{ color: scoreColor }}>
            {performanceScore}
          </div>
          <div className="officer-perf-label">Performance</div>
          <div className="officer-perf-bar">
            <div className="officer-perf-fill" style={{ width: `${performanceScore}%`, background: scoreColor }} />
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="my-cases-stats">
        {[
          { v: stats.total,           l: 'Assigned',        c: '' },
          { v: stats.pending,         l: 'Pending',         c: stats.pending > 0 ? 'warn' : '' },
          { v: stats.resolved,        l: 'Resolved',        c: 'good' },
          { v: `${stats.resRate}%`,   l: 'Resolution Rate', c: stats.resRate >= 70 ? 'good' : 'warn' },
          { v: stats.critical,        l: 'Critical',        c: stats.critical > 0 ? 'danger' : '' },
        ].map((s, i) => (
          <div key={i} className={`my-cases-stat ${s.c}`}>
            <div className="my-cases-stat-v">{s.v}</div>
            <div className="my-cases-stat-l">{s.l}</div>
          </div>
        ))}
      </div>

      {/* Filter Pills */}
      <div className="my-cases-filter-row">
        {[
          { key: 'all',      label: `All (${stats.total})` },
          { key: 'pending',  label: `Pending (${stats.pending})` },
          { key: 'resolved', label: `Resolved (${stats.resolved})` },
          { key: 'critical', label: `Critical (${stats.critical})` },
        ].map(f => (
          <button
            key={f.key}
            className={`my-cases-filter-btn${filter === f.key ? ' active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Empty State */}
      {filtered.length === 0 && (
        <div className="my-cases-empty">
          <span style={{ fontSize: 48 }}>📋</span>
          <div style={{ fontWeight: 700, marginTop: 12 }}>No cases found</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>
            {filter === 'all'
              ? 'No complaints are assigned to your profile yet.'
              : `No ${filter} cases right now.`}
          </div>
          {filter === 'all' && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, maxWidth: 280, textAlign: 'center' }}>
              Cases are matched by your officer name in the "Assigned To" field, or by ward if your ward ID is set.
            </div>
          )}
        </div>
      )}

      {/* Cases List */}
      {filtered.length > 0 && (
        <div className="my-cases-list">
          {filtered.map((c, i) => {
            const sla = getSLAInfo?.(c);
            const catLabel = CATEGORIES[c.category] || c.category || 'Health Issue';
            return (
              <motion.div
                key={c.id}
                className={`my-cases-item${c.resolved ? ' resolved' : c.severity === 'critical' ? ' critical' : ''}`}
                onClick={() => onDetail?.(c)}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                whileHover={{ scale: 1.01 }}
              >
                <div className="my-cases-item-top">
                  <div className="my-cases-item-left">
                    <span className={`sev-chip sev-${c.severity}`}>{c.severity}</span>
                    <span className="my-cases-id">{c.id}</span>
                  </div>
                  <div className="my-cases-item-right">
                    {sla?.breached && !c.resolved && (
                      <span className="sla-badge breached">⚠️ SLA</span>
                    )}
                    <span className={`status-badge ${c.resolved ? 'sb-resolved' : 'sb-open'}`}>
                      {c.resolved ? '✅ Resolved' : `⏳ ${c.status || 'Open'}`}
                    </span>
                  </div>
                </div>
                <div className="my-cases-category">{catLabel}</div>
                <div className="my-cases-meta">
                  <span>📍 {c.location || `Ward ${c.ward}`}</span>
                  <span>{timeAgo(c.time)}</span>
                </div>
                {c.desc && (
                  <div className="my-cases-desc">{c.desc.slice(0, 80)}{c.desc.length > 80 ? '…' : ''}</div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
