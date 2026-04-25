import { useState, useMemo, useCallback } from 'react';
import { WARDS } from '../../data/wardData';
import { SEV_PILL } from '../../utils/constants';

const SEV_LABEL = { critical: 'Critical', severe: 'Severe', moderate: 'Moderate', minor: 'Minor' };
const CATEGORIES = {
  'mosquito-nuisance': 'Mosquito Nuisance', 'breeding-stagnant': 'Stagnant Water', 'breeding-garbage': 'Garbage Breeding',
  'breeding-drain': 'Drain Breeding', 'water-muddy': 'Contaminated Water', 'water-smell': 'Bad Water Smell',
  'water-leakage': 'Pipeline Leak', 'sewer-mix': 'Sewage Mix', 'garbage': 'Garbage', 'drain-block': 'Blocked Drain',
  'fever-cluster': 'Fever Cluster', 'dengue-case': 'Dengue', 'malaria-case': 'Malaria',
};

function timeAgo(iso) {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const SEV_CARD_CLS = { critical: 'sev-critical', severe: 'sev-severe', moderate: 'sev-moderate', minor: 'sev-minor' };

function ComplaintCard({ c, onDetail }) {
  return (
    <div className={`ccard ${SEV_CARD_CLS[c.severity] || ''}`}>
      <div className="ccard-top">
        <span className="ccard-id">{c.id}</span>
        <div className="ccard-info">
          <button className="ccard-loc" onClick={() => onDetail(c)}>
            📍 {c.location} <span style={{ color: 'var(--blue2)', fontSize: 12 }}>↗</span>
          </button>
          <div className="ccard-meta">
            <span className={`pill ${SEV_PILL[c.severity] || 'p-mod'}`}>{SEV_LABEL[c.severity]}</span>
            <span className="pill p-cat">{CATEGORIES[c.category] || c.category}</span>
            <span className="pill p-time">🕐 {timeAgo(c.time)}</span>
            {c.status === 'Resolved'
              ? <span className="pill p-done">✅ Resolved</span>
              : <span className="pill p-prog">⏳ {c.status}</span>}
            {c.isDemo && <span className="pill p-demo">🧪 Demo</span>}
            {c.lat && <span className="pill p-gps">📡 GPS</span>}
          </div>
          {c.desc && <div className="ccard-desc">{c.desc}</div>}
        </div>
      </div>

      {/* Escalation Trail */}
      {c.escalations?.length > 0 && (
        <div className="esc-trail">
          <div className="esc-t">⚡ Escalation Trail</div>
          {c.escalations.map((e, i) => (
            <div key={i} className="esc-item">{e}</div>
          ))}
        </div>
      )}

      {/* Accountability Chain */}
      {c.hierarchy?.length > 0 && (
        <div className="hier-sec">
          <div className="hier-t">🔗 Accountability Chain</div>
          <div className="hier-chain">
            {c.hierarchy.map((h, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start' }}>
                <div className="hier-node">
                  <div className={`hier-av avl${h.level}`} title={h.role}>{h.initials}</div>
                  <div className="hier-name">{h.role}</div>
                </div>
                {i < c.hierarchy.length - 1 && <div className="hier-arr">→</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="cit-act">
        <button className="btn-v" onClick={() => onDetail(c)}>🔍 View Details</button>
        <button className="btn-nr">🚨 Dispute</button>
        {c.status !== 'Resolved' && (
          <button className="btn-es">⬆️ Escalate</button>
        )}
      </div>
    </div>
  );
}

function WardGroup({ ward, complaints, onDetail }) {
  const [open, setOpen] = useState(true);
  const unres = complaints.filter(c => !c.resolved).length;
  const done  = complaints.filter(c => c.resolved).length;

  return (
    <div className={`ward-grp ${open ? 'open' : ''}`}>
      <div className="wg-hdr" onClick={() => setOpen(o => !o)}>
        <div className="wg-l">
          <div className="wg-name">📍 {ward.name} — {ward.area}</div>
          <div className="wg-zone">{ward.zone} Zone · WMO: {ward.wmo} · SI: {ward.si}</div>
        </div>
        <div className="wg-r">
          <span className="wbadge wb-t">{complaints.length} Total</span>
          {unres > 0 && <span className="wbadge wb-o">{unres} Open</span>}
          {done > 0  && <span className="wbadge wb-d">{done} Done</span>}
          <span className="wchev">▼</span>
        </div>
      </div>
      {open && (
        <div className="wg-body" style={{ display: 'flex' }}>
          {complaints.map(c => <ComplaintCard key={c.id} c={c} onDetail={onDetail} />)}
        </div>
      )}
    </div>
  );
}

const FILTER_OPTS = [
  { key: 'all',        cls: '',   label: 'All' },
  { key: 'critical',   cls: 'cr', label: '🔴 Critical' },
  { key: 'severe',     cls: 'co', label: '🟠 Severe' },
  { key: 'vector',     cls: 'cg', label: '🦟 Vector' },
  { key: 'water',      cls: 'ct', label: '💧 Water' },
  { key: 'unresolved', cls: '',   label: '⏳ Pending' },
  { key: 'resolved',   cls: '',   label: '✅ Resolved' },
  { key: 'real',       cls: '',   label: '📍 Real GPS' },
];

export default function Complaints({ complaints, onDetail, onAlertBranch }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort]     = useState('newest');

  const filtered = useMemo(() => {
    let list = [...complaints];
    const q = search.toLowerCase();

    if (filter === 'critical')   list = list.filter(c => c.severity === 'critical');
    if (filter === 'severe')     list = list.filter(c => c.severity === 'severe');
    if (filter === 'vector')     list = list.filter(c => c.category?.includes('breeding') || c.category?.includes('mosquito') || c.category?.includes('dengue') || c.category?.includes('malaria'));
    if (filter === 'water')      list = list.filter(c => c.category?.includes('water') || c.category?.includes('sewer'));
    if (filter === 'unresolved') list = list.filter(c => !c.resolved);
    if (filter === 'resolved')   list = list.filter(c => c.resolved);
    if (filter === 'real')       list = list.filter(c => !c.isDemo);

    if (q) list = list.filter(c =>
      c.id?.toLowerCase().includes(q) ||
      c.location?.toLowerCase().includes(q) ||
      c.ward?.toLowerCase().includes(q) ||
      c.desc?.toLowerCase().includes(q)
    );

    if (sort === 'oldest')        list.sort((a, b) => new Date(a.time) - new Date(b.time));
    else if (sort === 'severity') list.sort((a, b) => ['critical','severe','moderate','minor'].indexOf(a.severity) - ['critical','severe','moderate','minor'].indexOf(b.severity));
    else                          list.sort((a, b) => new Date(b.time) - new Date(a.time));

    return list;
  }, [complaints, filter, search, sort]);

  // Single O(N) pass → grouped by ward; replaces O(N×26) per render
  const byWard = useMemo(() => {
    const map = {};
    filtered.forEach(c => {
      const wid = c.ward || c.ward_id;
      if (!wid) return;
      if (!map[wid]) map[wid] = [];
      map[wid].push(c);
    });
    return WARDS.map(w => ({ ward: w, complaints: map[w.id] || [] }))
                .filter(g => g.complaints.length > 0);
  }, [filtered]);

  const { total, unres, crit, res } = useMemo(() => ({
    total: complaints.length,
    unres: complaints.filter(c => !c.resolved).length,
    crit:  complaints.filter(c => c.severity === 'critical').length,
    res:   complaints.filter(c => c.resolved).length,
  }), [complaints]);

  return (
    <div className="page">
      {/* Header */}
      <div className="sec-hdr">
        <div>
          <h1 className="sec-title">Ward Complaints</h1>
          <div className="sec-sub">Full accountability chain · Citizen verification enabled</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            className="sbox"
            placeholder="🔍 Search ward, location, ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select className="ssel" value={sort} onChange={e => setSort(e.target.value)}>
            <option value="newest">🕐 Newest</option>
            <option value="oldest">🕐 Oldest</option>
            <option value="severity">🔴 Severity</option>
          </select>
          <button className="br" onClick={onAlertBranch}>🚨 Alert Branch</button>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="c-sum">
        {[
          { v: total, l: 'Total',        color: 'var(--blue2)' },
          { v: unres, l: 'Unresolved',   color: 'var(--orange2)' },
          { v: res,   l: 'Resolved',     color: 'var(--green2)' },
          { v: crit,  l: 'Critical',     color: 'var(--red2)' },
          { v: byWard.length, l: 'Active Wards', color: 'var(--text-primary)' },
        ].map((s, i) => (
          <div key={i} className="cs-item">
            <div className="cs-v" style={{ color: s.color }}>{s.v}</div>
            <div className="cs-l">{s.l}</div>
          </div>
        ))}
      </div>

      {/* Filter chips */}
      <div className="filter-bar">
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>Filter:</span>
        {FILTER_OPTS.map(f => (
          <button
            key={f.key}
            className={`chip ${f.cls} ${filter === f.key ? 'active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Results — flat list (mobile) / ward accordion (desktop) */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-ico">🔍</div>
          <div className="empty-state-t">No complaints found</div>
          <div className="empty-state-s">Try adjusting your filters or search terms</div>
        </div>
      ) : (
        <>
          {/* Desktop: ward accordion (unchanged) */}
          <div className="comp-accordion">
            {byWard.map(g => (
              <WardGroup key={g.ward.id} ward={g.ward} complaints={g.complaints} onDetail={onDetail} />
            ))}
          </div>

          {/* Mobile: flat list with sticky section headers */}
          <div className="comp-flat">
            {byWard.map(g => (
              <div key={g.ward.id} className="flat-group">
                <div className="flat-section-hdr">
                  <span className="flat-section-name">📍 {g.ward.name}</span>
                  <span className="flat-section-count">{g.complaints.length}</span>
                </div>
                {g.complaints.map(c => (
                  <ComplaintCard key={c.id} c={c} onDetail={onDetail} />
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
