import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement,
  PointElement, LineElement, Tooltip, Legend, Filler,
} from 'chart.js';
import { WARDS, CATEGORIES, SLA_HOURS } from '../../data/wardData';
import { exportCSV } from '../../utils/exportCSV';
import { generateReport } from '../../utils/generateReport';
import { timeAgo } from '../../utils/dateHelper';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Tooltip, Legend, Filler);

const DARK_CHART = {
  color: 'rgba(255,255,255,0.7)',
  plugins: {
    legend: { labels: { color: 'rgba(255,255,255,0.6)', font: { size: 11 } } },
    tooltip: { backgroundColor: '#1a2035', titleColor: '#fff', bodyColor: 'rgba(255,255,255,0.7)' },
  },
};
const DARK_SCALE = {
  y: { ticks: { color: 'rgba(255,255,255,0.4)' }, grid: { color: 'rgba(255,255,255,0.05)' } },
  x: { ticks: { color: 'rgba(255,255,255,0.4)' }, grid: { display: false } },
};

function getSLAInfo(c) {
  const hours = SLA_HOURS[c.severity] || 48;
  const elapsed = (Date.now() - new Date(c.time).getTime()) / 3600000;
  return { breached: !c.resolved && elapsed > hours, pct: Math.min(100, (elapsed / hours) * 100) };
}

// ── Generate fake audit log from complaints ──────────────────────────────────
function buildAuditLog(complaints) {
  const events = [];
  complaints.forEach(c => {
    events.push({
      id: `EVT-${c.id}-FILED`,
      type: 'filed',
      label: 'Complaint Filed',
      icon: '📋',
      color: '#3b82f6',
      complaint: c.id,
      ward: c.ward,
      user: c.citizenName || 'Citizen',
      time: c.time,
    });
    if (c.resolved) {
      events.push({
        id: `EVT-${c.id}-RES`,
        type: 'resolved',
        label: 'Complaint Resolved',
        icon: '✅',
        color: '#10b981',
        complaint: c.id,
        ward: c.ward,
        user: c.resolutionOfficer || c.assignedTo || 'Officer',
        time: c.resolvedAt || c.time,
      });
    }
    if (getSLAInfo(c).breached) {
      events.push({
        id: `EVT-${c.id}-SLA`,
        type: 'breach',
        label: 'SLA Breached',
        icon: '🚨',
        color: '#ef4444',
        complaint: c.id,
        ward: c.ward,
        user: 'System',
        time: c.time,
      });
    }
    if (c.escalations?.length > 0) {
      events.push({
        id: `EVT-${c.id}-ESC`,
        type: 'escalated',
        label: 'Escalated',
        icon: '⬆️',
        color: '#f59e0b',
        complaint: c.id,
        ward: c.ward,
        user: c.assignedTo || 'Officer',
        time: c.time,
      });
    }
  });
  return events.sort((a, b) => new Date(b.time) - new Date(a.time));
}

// ── Build staff performance from complaints ──────────────────────────────────
function buildStaffData(complaints) {
  const map = {};
  complaints.forEach(c => {
    const name = c.assignedTo || 'Unassigned';
    if (!map[name]) map[name] = { name, ward: c.ward, assigned: 0, resolved: 0, breached: 0 };
    map[name].assigned++;
    if (c.resolved) map[name].resolved++;
    if (getSLAInfo(c).breached) map[name].breached++;
  });
  return Object.values(map)
    .map(s => ({ ...s, score: s.assigned ? Math.round((s.resolved / s.assigned) * 100) : 0 }))
    .sort((a, b) => b.score - a.score);
}

const TABS = [
  ['overview',   '📊 Overview'],
  ['unresolved', '📋 Unresolved'],
  ['breached',   '🚨 Breached'],
  ['resolved',   '✅ Resolved'],
  ['audit',      '📜 Audit Log'],
  ['staff',      '👥 Staff'],
];

export default function AdminDashboard({ complaints, announcement, setAnnouncement }) {
  const [ward, setWard]       = useState('');
  const [category, setCategory] = useState('');
  const [severity, setSeverity] = useState('');
  const [status, setStatus]   = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate]   = useState('');
  const [tab, setTab]         = useState('overview');
  const [auditType, setAuditType] = useState('');
  const [annText, setAnnText] = useState(announcement || '');
  const [annSaved, setAnnSaved] = useState(false);
  const [searchId, setSearchId] = useState('');

  const filtered = useMemo(() => complaints.filter(c => {
    if (ward && c.ward !== ward) return false;
    if (category && c.category !== category) return false;
    if (severity && c.severity !== severity) return false;
    if (status === 'resolved' && !c.resolved) return false;
    if (status === 'open' && c.resolved) return false;
    if (status === 'breached' && !getSLAInfo(c).breached) return false;
    if (fromDate && new Date(c.time) < new Date(fromDate)) return false;
    if (toDate && new Date(c.time) > new Date(toDate + 'T23:59:59')) return false;
    return true;
  }), [complaints, ward, category, severity, status, fromDate, toDate]);

  // Single pass to compute all KPIs and chart data from filtered list
  const stats = useMemo(() => {
    let resolved = 0, open = 0, critical = 0, breached = 0;
    const wardMap = {};
    const catMap = {};
    filtered.forEach(c => {
      if (c.resolved) resolved++; else open++;
      if (c.severity === 'critical' && !c.resolved) critical++;
      if (getSLAInfo(c).breached) breached++;
      const wid = c.ward || c.ward_id;
      if (wid) {
        if (!wardMap[wid]) wardMap[wid] = { total: 0, resolved: 0 };
        wardMap[wid].total++;
        if (c.resolved) wardMap[wid].resolved++;
      }
      if (c.category) catMap[c.category] = (catMap[c.category] || 0) + 1;
    });
    return { resolved, open, critical, breached, wardMap, catMap };
  }, [filtered]);

  const { resolved, open, critical, breached, wardMap, catMap } = stats;
  const slaPct = filtered.length ? Math.round(((filtered.length - breached) / filtered.length) * 100) : 100;

  const topWards = WARDS.slice(0, 10);
  const barData = useMemo(() => ({
    labels: topWards.map(w => w.id),
    datasets: [
      { label: 'Reported', data: topWards.map(w => wardMap[w.id]?.total || 0), backgroundColor: 'rgba(37,99,235,0.65)', borderRadius: 6 },
      { label: 'Resolved', data: topWards.map(w => wardMap[w.id]?.resolved || 0), backgroundColor: 'rgba(16,185,129,0.65)', borderRadius: 6 },
    ],
  }), [wardMap]);

  const donutData = useMemo(() => ({
    labels: ['Resolved', 'Open', 'SLA Breached'],
    datasets: [{ data: [resolved, open - breached, breached], backgroundColor: ['#10b981', '#3b82f6', '#ef4444'], borderWidth: 0 }],
  }), [resolved, open, breached]);

  const catKeys = Object.keys(CATEGORIES).slice(0, 8);
  const catData = useMemo(() => ({
    labels: catKeys.map(k => CATEGORIES[k].replace('Mosquito ', 'M.')),
    datasets: [{ label: 'Complaints', data: catKeys.map(k => catMap[k] || 0), backgroundColor: 'rgba(139,92,246,0.6)', borderRadius: 6 }],
  }), [catMap]);

  const auditLog = useMemo(() => buildAuditLog(complaints), [complaints]);
  const staffData = useMemo(() => buildStaffData(complaints), [complaints]);

  const filteredAudit = useMemo(() => {
    let log = auditLog;
    if (auditType) log = log.filter(e => e.type === auditType);
    if (searchId) log = log.filter(e => e.complaint?.toLowerCase().includes(searchId.toLowerCase()));
    return log.slice(0, 200);
  }, [auditLog, auditType, searchId]);

  const IS = { background: 'var(--bg-input)', border: '1px solid var(--border2)', borderRadius: 'var(--r8)', padding: '8px 12px', fontSize: 12, color: 'var(--text-primary)', outline: 'none', minWidth: 130 };

  return (
    <div className="page page-enter">
      {/* Header */}
      <div className="page-hdr">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ background: 'linear-gradient(135deg,var(--red),var(--orange))', padding: '6px 14px', borderRadius: 'var(--r-full)', fontSize: 11, fontWeight: 800, color: '#fff' }}>🔐 ADMIN</div>
          <div>
            <h1 className="page-title">Admin Command Centre</h1>
            <p className="page-sub">Analytics · Audit Log · Staff Performance · Announcements</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="bp" onClick={() => exportCSV(filtered)} style={{ fontSize: 12, padding: '9px 16px' }}>📊 Export CSV</button>
          <button className="bp" onClick={() => generateReport(filtered[0])} style={{ fontSize: 12, padding: '9px 16px', background: 'var(--glass-bg)' }}>📄 Summary PDF</button>
        </div>
      </div>

      {/* Announcement Editor */}
      <div className="adm-ann-bar">
        <span className="adm-ann-icon">📢</span>
        <input
          className="adm-ann-input"
          placeholder="Type a public announcement for citizens (shown as banner on map page)…"
          value={annText}
          onChange={e => { setAnnText(e.target.value); setAnnSaved(false); }}
        />
        <button className="adm-ann-btn" onClick={() => { setAnnouncement?.(annText); setAnnSaved(true); }}>
          {annSaved ? '✓ Saved' : 'Publish'}
        </button>
        {annText && <button className="adm-ann-clear" onClick={() => { setAnnText(''); setAnnouncement?.(''); setAnnSaved(false); }}>✕</button>}
      </div>

      {/* Filters */}
      <div className="admin-filters">
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.8px' }}>🔍 Filters</span>
        <select style={IS} value={ward} onChange={e => setWard(e.target.value)}>
          <option value="">All Wards</option>
          {WARDS.map(w => <option key={w.id} value={w.id}>{w.id} — {w.area}</option>)}
        </select>
        <select style={IS} value={category} onChange={e => setCategory(e.target.value)}>
          <option value="">All Categories</option>
          {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select style={IS} value={severity} onChange={e => setSeverity(e.target.value)}>
          <option value="">All Severities</option>
          {['critical','severe','moderate','minor'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <select style={IS} value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
          <option value="breached">SLA Breached</option>
        </select>
        <input type="date" style={IS} value={fromDate} onChange={e => setFromDate(e.target.value)} />
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>→</span>
        <input type="date" style={IS} value={toDate} onChange={e => setToDate(e.target.value)} />
        <button onClick={() => { setWard(''); setCategory(''); setSeverity(''); setStatus(''); setFromDate(''); setToDate(''); }}
          style={{ ...IS, color: 'var(--red2)', cursor: 'pointer' }}>✕ Clear</button>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{filtered.length} / {complaints.length} records</span>
      </div>

      {/* KPI Strip */}
      <div className="admin-kpi-grid">
        {[
          { v: filtered.length, l: 'Total',        c: 'var(--blue2)',   bg: 'rgba(37,99,235,0.1)' },
          { v: open,            l: 'Open',          c: 'var(--orange2)', bg: 'rgba(249,115,22,0.1)' },
          { v: critical,        l: 'Critical',      c: 'var(--red2)',    bg: 'rgba(239,68,68,0.1)' },
          { v: resolved,        l: 'Resolved',      c: 'var(--green2)',  bg: 'rgba(16,185,129,0.1)' },
          { v: breached,        l: 'SLA Breached',  c: 'var(--red2)',    bg: 'rgba(239,68,68,0.07)' },
          { v: `${slaPct}%`,    l: 'SLA Compliance',c: slaPct >= 80 ? 'var(--green2)' : 'var(--orange2)', bg: 'rgba(16,185,129,0.06)' },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            style={{ background: s.bg, border: `1px solid ${s.c}33`, borderRadius: 'var(--r20)', padding: '16px 18px', textAlign: 'center' }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: s.c, fontFamily: 'var(--ff-mono)', lineHeight: 1 }}>{s.v}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px' }}>{s.l}</div>
          </motion.div>
        ))}
      </div>

      {/* Tab Row */}
      <div className="adm-tab-row">
        {TABS.map(([k, l]) => (
          <button key={k} className={`adm-tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === 'overview' && (
        <div className="admin-charts-grid">
          <div className="chart-box">
            <div className="chart-box-t">📊 Reported vs Resolved — Top 10 Wards</div>
            <Bar data={barData} options={{ ...DARK_CHART, scales: DARK_SCALE, responsive: true }} height={120} />
          </div>
          <div className="chart-box" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="chart-box-t">🍩 Status Breakdown</div>
            <Doughnut data={donutData} options={{ ...DARK_CHART, cutout: '68%', responsive: true }} />
          </div>
          <div className="chart-box" style={{ gridColumn: '1/-1' }}>
            <div className="chart-box-t">🗂️ Complaints by Category</div>
            <Bar data={catData} options={{ ...DARK_CHART, scales: DARK_SCALE, responsive: true }} height={80} />
          </div>
        </div>
      )}

      {/* ── COMPLAINT TABLES ── */}
      {['unresolved','breached','resolved'].includes(tab) && (
        <div className="adm-table-wrap">
          <table className="dtbl adm-dtbl">
            <thead>
              <tr>
                {['ID','Ward','Category','Severity','Location','Filed','Assigned To','SLA Status','Action'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered
                .filter(c =>
                  tab === 'unresolved' ? !c.resolved && !getSLAInfo(c).breached :
                  tab === 'breached'   ? getSLAInfo(c).breached :
                  c.resolved
                )
                .slice(0, 150)
                .map((c, i) => {
                  const sla = getSLAInfo(c);
                  return (
                    <tr key={c.id} className={i % 2 === 0 ? '' : 'adm-tr-alt'}>
                      <td className="adm-td-id">{c.id}</td>
                      <td className="adm-td-bold">{c.ward}</td>
                      <td className="adm-td-sec">{CATEGORIES[c.category] || c.category}</td>
                      <td><span className={`pill p-${c.severity === 'critical' ? 'crit' : c.severity === 'severe' ? 'sev' : c.severity === 'moderate' ? 'mod' : 'min'}`}>{c.severity}</span></td>
                      <td className="adm-td-loc">{c.location}</td>
                      <td className="adm-td-muted">{timeAgo(c.time)}</td>
                      <td className="adm-td-sec">{c.assignedTo || '—'}</td>
                      <td>
                        <span className={`adm-sla-badge ${sla.breached ? 'br' : 'ok'}`}>
                          {sla.breached ? '⚠ Breached' : '✓ OK'}
                        </span>
                      </td>
                      <td>
                        {c.resolved && c.resolutionPhoto && (
                          <button onClick={() => generateReport(c)} className="adm-pdf-btn">📄 PDF</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── AUDIT LOG ── */}
      {tab === 'audit' && (
        <div>
          <div className="adm-audit-toolbar">
            <span className="adm-audit-count">{filteredAudit.length} events</span>
            <input
              className="adm-audit-search"
              placeholder="🔍 Search complaint ID…"
              value={searchId}
              onChange={e => setSearchId(e.target.value)}
            />
            <div className="adm-audit-type-row">
              {[['', 'All'], ['filed', '📋 Filed'], ['resolved', '✅ Resolved'], ['breach', '🚨 Breach'], ['escalated', '⬆️ Escalated']].map(([k, l]) => (
                <button key={k} className={`adm-audit-chip ${auditType === k ? 'active' : ''}`} onClick={() => setAuditType(k)}>{l}</button>
              ))}
            </div>
            <button className="bp" onClick={() => exportCSV(filteredAudit)} style={{ fontSize: 11, padding: '7px 14px', marginLeft: 'auto' }}>⬇ CSV</button>
          </div>

          <div className="adm-table-wrap">
            <table className="dtbl adm-dtbl">
              <thead>
                <tr>
                  {['Time', 'Event', 'Complaint ID', 'Ward', 'Performed By'].map(h => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {filteredAudit.map((e, i) => (
                  <tr key={e.id} className={i % 2 === 0 ? '' : 'adm-tr-alt'}>
                    <td className="adm-td-muted" style={{ whiteSpace: 'nowrap' }}>{timeAgo(e.time)}</td>
                    <td>
                      <span className="adm-event-badge" style={{ background: `${e.color}18`, color: e.color, border: `1px solid ${e.color}40` }}>
                        {e.icon} {e.label}
                      </span>
                    </td>
                    <td className="adm-td-id">{e.complaint}</td>
                    <td className="adm-td-bold">{e.ward}</td>
                    <td className="adm-td-sec">{e.user}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── STAFF PERFORMANCE ── */}
      {tab === 'staff' && (
        <div>
          <div className="adm-staff-grid">
            {staffData.map((s, i) => {
              const scoreColor = s.score >= 80 ? '#10b981' : s.score >= 50 ? '#f59e0b' : '#ef4444';
              return (
                <motion.div key={s.name} className="adm-staff-card"
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <div className="adm-staff-top">
                    <div className="adm-staff-av">{s.name.slice(0, 2).toUpperCase()}</div>
                    <div className="adm-staff-info">
                      <div className="adm-staff-name">{s.name}</div>
                      <div className="adm-staff-ward">Ward {s.ward}</div>
                    </div>
                    <div className="adm-staff-score" style={{ color: scoreColor }}>{s.score}%</div>
                  </div>
                  <div className="adm-staff-bar-wrap">
                    <div className="adm-staff-bar" style={{ width: `${s.score}%`, background: scoreColor }} />
                  </div>
                  <div className="adm-staff-stats">
                    <span>📋 {s.assigned} assigned</span>
                    <span style={{ color: '#10b981' }}>✅ {s.resolved} resolved</span>
                    <span style={{ color: '#ef4444' }}>🚨 {s.breached} breached</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
