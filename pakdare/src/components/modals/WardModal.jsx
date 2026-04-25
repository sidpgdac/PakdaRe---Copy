import { useRef } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { RISK_COLOR, RISK_LABEL } from '../../data/wardData';
import { OfficerCard, HierarchyChain } from '../shared/HierarchyChain';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
function rand7() { return Array.from({ length: 7 }, () => Math.floor(Math.random() * 12)); }

const RISK_STAT_COLOR = (risk) => {
  if (risk >= 75) return 'var(--red2)';
  if (risk >= 50) return 'var(--orange2)';
  if (risk >= 30) return 'var(--yellow)';
  return 'var(--green2)';
};

export default function WardModal({ ward, complaints, onClose, onViewComplaints }) {
  const chartData = useRef(rand7());

  if (!ward) return null;

  const wc    = complaints.filter(c => c.ward === ward.id);
  const unres = wc.filter(c => !c.resolved).length;
  const res   = wc.filter(c => c.resolved).length;
  const rc    = RISK_STAT_COLOR(ward.risk);

  const siOfficers = (ward.siTeam || []).map((s, idx) => ({
    role: 'Sanitary Inspector',
    name: s.name,
    initials: s.name.split(' ').map(x => x[0]).join(''),
    cls: 'avl2',
    level: 4,
    pend: idx === 0 ? Math.max(0, unres) : 0
  }));

  const officers = [
    { role: 'Medical Officer of Health', name: ward.wmo, initials: ward.wmo?.split(' ').map(x => x[0]).join('') || 'MH', cls: 'avl1', level: 3, pend: unres + 2 },
    ...siOfficers,
    { role: 'Dist. Malaria Officer', name: 'Dr. K. Sharma', initials: 'KS', cls: 'avl3', level: 2, pend: ward.clusters },
    { role: 'Insecticide Branch',   name: 'A. Sawant', initials: 'AS', cls: 'avl4', level: 4, pend: Math.floor(ward.breeding / 2) },
  ];

  const riskPct = ward.risk;
  const riskBarColor = riskPct >= 75 ? 'var(--red)' : riskPct >= 50 ? 'var(--orange)' : riskPct >= 30 ? 'var(--yellow)' : 'var(--green)';
  const gradTop = riskPct >= 75 ? '#ef4444' : riskPct >= 50 ? '#f97316' : riskPct >= 30 ? '#eab308' : '#10b981';

  const chartCfg = {
    labels: DAYS,
    datasets: [{
      label: 'Complaints',
      data: chartData.current,
      backgroundColor: `${gradTop}33`,
      borderColor: gradTop,
      borderWidth: 2,
      borderRadius: 8,
      hoverBackgroundColor: `${gradTop}66`,
    }],
  };

  return (
    <div className="mov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="mbox">
        {/* Colored header bar */}
        <div style={{ height: 4, background: `linear-gradient(90deg, ${gradTop}, ${gradTop}88)` }} />

        <div className="mhdr" style={{ background: `linear-gradient(135deg, ${gradTop}22, transparent)`, borderBottom: '1px solid var(--border)' }}>
          <div>
            <div className="mtitle" style={{ color: 'var(--text-primary)' }}>
              {ward.name} — {ward.area}
            </div>
            <div className="msub" style={{ color: 'var(--text-secondary)' }}>
              {ward.zone} Zone · Risk Score: <span style={{ color: rc, fontWeight: 700 }}>{ward.risk}/100</span> · {RISK_LABEL(ward.risk)}
            </div>
          </div>
          <button className="mclose" onClick={onClose}>✕</button>
        </div>

        <div className="mbody">
          {/* Stats */}
          <div className="mstats" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {[
              { v: ward.risk,     l: 'Risk Index',     c: rc },
              { v: unres,         l: 'Unresolved',     c: 'var(--orange2)' },
              { v: res,           l: 'Resolved',       c: 'var(--green2)' },
              { v: ward.clusters, l: 'Clusters',       c: 'var(--blue2)' },
              { v: ward.breeding, l: 'Breeding Sites', c: 'var(--red2)' },
              { v: ward.avgRes + 'h', l: 'Avg Res.',  c: 'var(--text-secondary)' },
            ].map((s, i) => (
              <div key={i} className="mstat">
                <div className="mstat-v" style={{ color: s.c }}>{s.v}</div>
                <div className="mstat-l">{s.l}</div>
              </div>
            ))}
          </div>

          {/* Risk Bar */}
          <div style={{ marginBottom: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>📊 Risk Score</span>
              <span style={{ fontFamily: 'var(--ff-mono)', fontWeight: 800, fontSize: 16, color: rc }}>{ward.risk}/100</span>
            </div>
            <div className="rbar-full">
              <div className="rfill-full" style={{ width: `${ward.risk}%`, background: `linear-gradient(90deg, ${riskBarColor}88, ${riskBarColor})`, transition: 'width 1s ease' }} />
            </div>
          </div>

          {/* 7-day Trend */}
          <div className="chart-box" style={{ marginBottom: 22 }}>
            <div className="chart-box-t">📈 7-Day Complaint Trend</div>
            <Bar
              data={chartCfg}
              options={{
                responsive: true,
                plugins: {
                  legend: { display: false },
                  tooltip: { callbacks: { title: ([i]) => DAYS[i.dataIndex] } },
                },
                scales: {
                  y: {
                    beginAtZero: true, ticks: { stepSize: 2, color: 'rgba(255,255,255,0.4)', font: { size: 10 } },
                    grid: { color: 'rgba(255,255,255,0.05)' },
                  },
                  x: {
                    ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 10 } },
                    grid: { display: false },
                  },
                },
              }}
              height={90}
            />
          </div>

          {/* Hierarchy Chain */}
          <HierarchyChain ward={ward} />

          {/* Officers */}
          <div style={{ marginTop: 20, marginBottom: 22 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 12 }}>
              👮 Ward Officers
            </div>
            <div className="off-grid">
              {officers.map((o, i) => (
                <OfficerCard key={i} officer={o} index={i} />
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="bp" onClick={onViewComplaints} style={{ flex: 1, padding: '11px 18px', fontSize: 13 }}>
              📋 View Complaints →
            </button>
            <button className="br" onClick={onClose} style={{ flex: 1, padding: '11px 18px', fontSize: 13 }}>
              🚨 Alert Insecticide
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
