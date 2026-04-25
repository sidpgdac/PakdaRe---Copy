import { WARDS, RISK_COLOR, RISK_LABEL } from '../../data/wardData';

const RISK_BAR_COLOR = (risk) => {
  if (risk >= 75) return 'var(--red)';
  if (risk >= 50) return 'var(--orange)';
  if (risk >= 30) return 'var(--yellow)';
  return 'var(--green)';
};

function MiniKPI({ icon, value, label, color }) {
  return (
    <div style={{
      flex: 1, minWidth: 'min(140px, 45%)', background: 'var(--glass-bg)',
      border: '1px solid var(--border)', borderRadius: 'var(--r16)',
      padding: '14px 18px', textAlign: 'center', transition: 'all .2s',
    }}>
      <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 26, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.7px', marginTop: 5 }}>{label}</div>
    </div>
  );
}

export default function Summary({ complaints, onWardClick }) {
  const sorted = [...WARDS].sort((a, b) => b.risk - a.risk);

  const wardStats = (w) => {
    const wc = complaints.filter(c => c.ward === w.id);
    return {
      total:      wc.length || w.breeding,
      unresolved: wc.filter(c => !c.resolved).length,
      resolved:   wc.filter(c => c.resolved).length,
    };
  };

  const totalComplaints = complaints.length;
  const totalUnres      = complaints.filter(c => !c.resolved).length;
  const totalCrit       = complaints.filter(c => c.severity === 'critical').length;
  const totalRes        = complaints.filter(c => c.resolved).length;

  return (
    <div className="page">
      <div className="page-hdr">
        <div className="page-hdr-row">
          <div>
            <h1 className="page-title">Ward Summary Report</h1>
            <p className="page-sub">Full performance matrix · All {WARDS.length} BMC wards · Click any row for ward profile</p>
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', alignSelf: 'flex-end' }}>
            🔄 Refreshes every 30 sec
          </span>
        </div>
      </div>

      {/* Mini KPI Strip */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        <MiniKPI icon="📋" value={totalComplaints} label="Total Reports"   color="var(--blue2)" />
        <MiniKPI icon="⏳" value={totalUnres}      label="Unresolved"      color="var(--orange2)" />
        <MiniKPI icon="✅" value={totalRes}         label="Resolved"        color="var(--green2)" />
        <MiniKPI icon="🔴" value={totalCrit}        label="Critical"        color="var(--red2)" />
      </div>

      {/* Table */}
      <div className="tcard">
        <div className="thdr">
          <div className="tttl">📊 Ward Performance Matrix</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="dtbl">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Ward</th>
                <th>Zone</th>
                <th>Area</th>
                <th>M.O.H.</th>
                <th>SI</th>
                <th>Total</th>
                <th>Unresolved</th>
                <th>Resolved</th>
                <th>Breeding</th>
                <th>Clusters</th>
                <th>Avg Res.</th>
                <th>Risk</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((w, i) => {
                const { total, unresolved, resolved } = wardStats(w);
                const rc = RISK_BAR_COLOR(w.risk);
                const rankCls = i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : 'rank-n';
                const statCls = w.risk >= 75 ? 'sb-critical' : w.risk >= 50 ? 'sb-high' : w.risk >= 30 ? 'sb-medium' : 'sb-low';
                return (
                  <tr key={w.id} onClick={() => onWardClick(w)}>
                    <td data-label="Rank">
                      <span className={`rank-badge ${rankCls}`}>{i + 1}</span>
                    </td>
                    <td data-label="Ward">
                      <strong style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{w.name}</strong>
                    </td>
                    <td data-label="Zone">{w.zone}</td>
                    <td data-label="Area" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{w.area}</td>
                    <td data-label="M.O.H." style={{ fontSize: 11 }}>{w.wmo}</td>
                    <td data-label="SI" style={{ fontSize: 11 }}>
                      {w.siTeam?.length > 0 ? (
                        <>
                          <div style={{ fontWeight: 600 }}>{w.siTeam[0].name}</div>
                          {w.siTeam.length > 1 && (
                            <div style={{ color: 'var(--blue2)', fontSize: 9, fontWeight: 700 }}>
                              + {w.siTeam.length - 1} OTHER INSPECTORS
                            </div>
                          )}
                        </>
                      ) : '—'}
                    </td>
                    <td data-label="Total">
                      <span style={{ fontFamily: 'var(--ff-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>{total}</span>
                    </td>
                    <td data-label="Unresolved">
                      <span style={{ fontFamily: 'var(--ff-mono)', fontWeight: 700, color: unresolved > 0 ? 'var(--orange2)' : 'var(--green2)' }}>
                        {unresolved}
                      </span>
                    </td>
                    <td data-label="Resolved">
                      <span style={{ fontFamily: 'var(--ff-mono)', fontWeight: 700, color: 'var(--green2)' }}>{resolved}</span>
                    </td>
                    <td data-label="Breeding">
                      <span style={{ fontFamily: 'var(--ff-mono)', fontWeight: 700, color: 'var(--red2)' }}>{w.breeding}</span>
                    </td>
                    <td data-label="Clusters">
                      <span style={{ fontFamily: 'var(--ff-mono)', fontWeight: 700 }}>{w.clusters}</span>
                    </td>
                    <td data-label="Avg Res." style={{ fontSize: 11 }}>{w.avgRes}h</td>
                    <td data-label="Risk">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div className="rbar">
                          <div className="rfill" style={{ width: `${w.risk}%`, background: rc }} />
                        </div>
                        <span style={{ fontFamily: 'var(--ff-mono)', fontWeight: 800, fontSize: 12, color: rc }}>{w.risk}</span>
                        <span className={`status-badge ${statCls}`} style={{ padding: '2px 8px' }}>{RISK_LABEL(w.risk)}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
