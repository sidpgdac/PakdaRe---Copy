import { useMemo } from 'react';
import { WARDS, RISK_COLOR, RISK_LABEL } from '../../data/wardData';

const STAT_CARDS = (complaints) => {
  const total      = complaints.length;
  const unresolved = complaints.filter(c => !c.resolved).length;
  const resolved   = complaints.filter(c => c.resolved).length;
  const critical   = complaints.filter(c => c.severity === 'critical').length;
  const breeding   = complaints.filter(c => c.category?.includes('breeding')).length;

  return [
    { cls: 'cd', ico: '🔴', v: critical,      l: 'Critical Cases',     d: `${unresolved} unresolved`, dc: 'up' },
    { cls: 'cw', ico: '⏳', v: unresolved,    l: 'Pending Complaints', d: `${total} total filed`,     dc: 'up' },
    { cls: 'cs', ico: '✅', v: resolved,       l: 'Resolved Today',     d: '↓ avg 24h resolution',    dc: 'dn' },
    { cls: 'ci', ico: '🦟', v: breeding,      l: 'Breeding Sites',     d: 'Active clusters found',   dc: 'up' },
    { cls: 'cg', ico: '🏙️', v: WARDS.length, l: 'Wards Monitored',   d: 'All zones active',        dc: 'dn' },
  ];
};

const RISK_BAR_COLOR = (risk) => {
  if (risk >= 75) return 'var(--red)';
  if (risk >= 50) return 'var(--orange)';
  if (risk >= 30) return 'var(--yellow)';
  return 'var(--green)';
};

function RiskBar({ risk }) {
  const col = RISK_BAR_COLOR(risk);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div className="rbar" style={{ position: 'relative', overflow: 'hidden' }}>
        <div className="rfill" style={{ width: `${risk}%`, background: col, animation: 'barFill 0.8s ease' }} />
      </div>
      <span style={{ fontFamily: 'var(--ff-mono)', fontWeight: 700, fontSize: 12, color: col }}>{risk}</span>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="page" style={{ opacity: 0.7 }}>
      <div className="page-hdr">
        <div className="skeleton" style={{ width: 260, height: 28, borderRadius: 6, marginBottom: 8 }} />
        <div className="skeleton" style={{ width: 320, height: 16, borderRadius: 4 }} />
      </div>
      <div className="stats-grid" style={{ pointerEvents: 'none' }}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="sc">
            <div className="skeleton" style={{ width: 36, height: 36, borderRadius: '50%' }} />
            <div className="sc-row" style={{ marginTop: 10 }}>
              <div className="skeleton" style={{ width: 40, height: 24, borderRadius: 4, marginBottom: 6 }} />
              <div className="skeleton" style={{ width: 80, height: 14, borderRadius: 4 }} />
            </div>
          </div>
        ))}
      </div>
      <div className="tcard" style={{ padding: 20 }}>
        <div className="skeleton" style={{ width: 200, height: 24, borderRadius: 6, marginBottom: 20 }} />
        <div className="skeleton" style={{ width: '100%', height: 60, borderRadius: 12, marginBottom: 10 }} />
        <div className="skeleton" style={{ width: '100%', height: 60, borderRadius: 12, marginBottom: 10 }} />
        <div className="skeleton" style={{ width: '100%', height: 60, borderRadius: 12 }} />
      </div>
    </div>
  );
}

export default function Dashboard({ complaints, setActivePage, onWardClick, seedDemo, clearDemo }) {
  // Single O(N) pass → lookup map; replaces 54× O(N) filter calls per render
  const wardComplaintsMap = useMemo(() => {
    const map = {};
    complaints.forEach(c => {
      const wid = c.ward || c.ward_id;
      if (!wid) return;
      if (!map[wid]) map[wid] = [];
      map[wid].push(c);
    });
    return map;
  }, [complaints]);

  const cards  = useMemo(() => STAT_CARDS(complaints), [complaints]);
  const sorted = useMemo(() => [...WARDS].sort((a, b) => b.risk - a.risk), []);
  const wardComplaints = (wid) => wardComplaintsMap[wid] || [];

  return (
    <div className="page">
      {/* Page Header */}
      <div className="page-hdr">
        <div className="page-hdr-row">
          <div>
            <h1 className="page-title">Public Health Command Center</h1>
            <p className="page-sub">Real-time disease surveillance · All 27 BMC Wards · Mumbai</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="bp" onClick={() => setActivePage('report')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              ➕ File Report
            </button>
            <button className="bo" onClick={() => setActivePage('map')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              🗺️ Live Map
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stats-grid">
        {cards.map((c, i) => (
          <div key={i} className={`sc ${c.cls} sc-${i}`}>
            <div className="sc-ico">{c.ico}</div>
            <div className="sc-row">
              <div className="sc-left">
                <div className="sc-v">{c.v}</div>
                <div className="sc-l">{c.l}</div>
                <div className={`sc-d ${c.dc}`}>
                  {c.dc === 'up' ? '↑' : '↓'} {c.d}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Ward Risk Leaderboard */}
      <div className="tcard">
        <div className="thdr">
          <div>
            <div className="tttl">🏆 Ward Risk Leaderboard</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>Click any row to open ward profile</div>
          </div>
          <button className="bp" onClick={() => setActivePage('summary')}>Full Report →</button>
        </div>

        {/* ── DESKTOP: full 9-column table ── */}
        <div className="dashboard-table-wrap" style={{ overflowX: 'auto' }}>
          <table className="dtbl">
            <thead>
              <tr>
                <th>Rank</th><th>Ward</th><th>Zone</th><th>WMO</th>
                <th>Clusters</th><th>Complaints</th><th>Unresolved</th><th>Risk</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((w, i) => {
                const wc      = wardComplaints(w.id);
                const unres   = wc.filter(c => !c.resolved).length;
                const rankCls = i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : 'rank-n';
                const riskLabel = RISK_LABEL(w.risk);
                const statCls = w.risk >= 75 ? 'sb-critical' : w.risk >= 50 ? 'sb-high' : w.risk >= 30 ? 'sb-medium' : 'sb-low';
                return (
                  <tr key={w.id} onClick={() => onWardClick(w)}>
                    <td><span className={`rank-badge ${rankCls}`}>{i + 1}</span></td>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 13 }}>{w.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{w.area}</div>
                    </td>
                    <td>{w.zone}</td>
                    <td style={{ fontSize: 11 }}>{w.wmo}</td>
                    <td><span style={{ fontFamily: 'var(--ff-mono)', fontWeight: 700, color: 'var(--red2)' }}>{w.clusters}</span></td>
                    <td><span style={{ fontFamily: 'var(--ff-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>{wc.length || w.breeding}</span></td>
                    <td><span style={{ fontFamily: 'var(--ff-mono)', fontWeight: 700, color: unres > 0 ? 'var(--orange2)' : 'var(--green2)' }}>{unres}</span></td>
                    <td><RiskBar risk={w.risk} /></td>
                    <td><span className={`status-badge ${statCls}`}>{riskLabel}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── MOBILE: scannable ward cards ── */}
        <div className="dashboard-cards-wrap" style={{ padding: '12px' }}>
          <div className="ward-card-grid">
            {sorted.map((w, i) => {
              const wc        = wardComplaints(w.id);
              const total     = wc.length || w.breeding || 0;
              const riskLabel = RISK_LABEL(w.risk);
              const riskCls   = w.risk >= 75 ? 'risk-critical' : w.risk >= 50 ? 'risk-high' : w.risk >= 30 ? 'risk-medium' : 'risk-low';
              const riskColor = w.risk >= 75 ? 'var(--red)' : w.risk >= 50 ? 'var(--orange)' : w.risk >= 30 ? 'var(--yellow)' : 'var(--green)';
              const medals    = ['🥇', '🥈', '🥉'];
              const statCls   = w.risk >= 75 ? 'sb-critical' : w.risk >= 50 ? 'sb-high' : w.risk >= 30 ? 'sb-medium' : 'sb-low';
              return (
                <button
                  key={w.id}
                  className={`ward-card ${riskCls}`}
                  onClick={() => onWardClick(w)}
                >
                  <span className="ward-card-rank">{i < 3 ? medals[i] : `#${i + 1}`}</span>
                  <div className="ward-card-body">
                    <div className="ward-card-name">{w.name}</div>
                    <div className="ward-card-meta">{w.area} · {w.wmo?.split(' ')[0]}</div>
                    <div className="ward-card-bar-wrap">
                      <div className="ward-card-bar" style={{ width: `${w.risk}%`, background: riskColor }} />
                    </div>
                  </div>
                  <div className="ward-card-right">
                    <div className="ward-card-count" style={{ color: riskColor }}>{total}</div>
                    <span className={`ward-card-badge status-badge ${statCls}`}>{riskLabel}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
