import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WARDS } from '../../data/wardData';
import BeforeAfterSlider from '../ui/BeforeAfterSlider';
import LightboxModal from '../ui/LightboxModal';
import { SEV_PILL } from '../../utils/constants';

const CATEGORIES = {
  'mosquito-nuisance': 'Mosquito Nuisance', 'breeding-stagnant': 'Stagnant Water', 'breeding-garbage': 'Garbage Breeding',
  'breeding-drain': 'Drain Breeding', 'water-muddy': 'Contaminated Water', 'water-smell': 'Bad Water Smell',
  'water-leakage': 'Pipeline Leak', 'sewer-mix': 'Sewage Mix', 'garbage': 'Garbage', 'drain-block': 'Blocked Drain',
  'fever-cluster': 'Fever Cluster', 'dengue-case': 'Dengue', 'malaria-case': 'Malaria',
};

const FILTER_OPTS = [
  { key: 'all',        label: 'All' },
  { key: 'unresolved', label: '⏳ Pending' },
  { key: 'resolved',   label: '✅ Resolved' },
];

function timeAgo(iso) {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function PublicComplaintRow({ c, isExpanded, onToggle }) {
  const ward = WARDS.find(w => w.id === c.ward);
  const officerName = c.assignedTo || (ward ? ward.wmo : 'Pending Assignment');
  const [lbxSrc, setLbxSrc] = useState(null);
  const allImgs = [...(c.photos || []), ...(c.resolutionPhoto ? [c.resolutionPhoto] : [])];

  return (
    <>
    <div className="pg-row-wrapper">
      {/* Grid Row Header */}
      <div className="pg-row-hdr" onClick={onToggle}>
        <div className="pg-cell-id">
          <span className="pg-id-badge">#{c.id.split('-')[0]}</span>
        </div>
        <div className="pg-cell-cat">
          <div className="pg-cat-name">{CATEGORIES[c.category] || c.category}</div>
          <div className="pg-cat-time">{timeAgo(c.time)}</div>
        </div>
        <div className="pg-cell-ward">
          <span>📍 {ward?.name || c.ward}</span>
        </div>
        <div className="pg-cell-status">
          {c.resolved ? (
            <span className="pill p-done">✅ Resolved</span>
          ) : (
            <span className="pill p-prog">⏳ {c.status || 'Open'}</span>
          )}
        </div>
        <div className="pg-cell-chev">{isExpanded ? '▲' : '▼'}</div>
      </div>

      {/* Expandable Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            key="expanded"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: 'hidden', borderTop: '1px solid var(--border)' }}
          >
            <div className="pg-expanded">
              {/* Detail Grid */}
              <div className="pg-detail-grid">
                <div className="pg-detail-item">
                  <div className="pg-detail-lbl">Location</div>
                  <div className="pg-detail-val">📍 {c.location}</div>
                </div>
                <div className="pg-detail-item">
                  <div className="pg-detail-lbl">Assigned Officer</div>
                  <div className="pg-detail-val">👮 {officerName}</div>
                </div>
                {c.resolved && c.resolutionOfficer && (
                  <div className="pg-detail-item">
                    <div className="pg-detail-lbl">Resolved By</div>
                    <div className="pg-detail-val" style={{ color: 'var(--green2)' }}>✓ {c.resolutionOfficer}</div>
                  </div>
                )}
                {c.desc && (
                  <div className="pg-detail-item pg-detail-full">
                    <div className="pg-detail-lbl">Description</div>
                    <p className="pg-detail-desc">{c.desc}</p>
                  </div>
                )}
              </div>

              {/* Image Evidence */}
              <div className="pg-img-section">
                <div className="pg-detail-lbl" style={{ marginBottom: 10 }}>Image Evidence</div>
                {c.resolved && c.resolutionPhoto ? (
                  <div className="pg-slider-wrap">
                    <BeforeAfterSlider
                      beforeSrc={c.photos?.[0] || 'https://placehold.co/400x260/111827/444?text=No+Photo'}
                      afterSrc={c.resolutionPhoto}
                      height={220}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                      <span>Before</span><span>After</span>
                    </div>
                  </div>
                ) : c.photos?.[0] ? (
                  <div className="pg-img-wrap" style={{ cursor: 'zoom-in' }} onClick={() => setLbxSrc(c.photos[0])}>
                    <img src={c.photos[0]} alt="Complaint Evidence" className="pg-img" />
                    <div style={{ position:'absolute', bottom:6, right:6, background:'rgba(0,0,0,0.55)', color:'#fff', fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:6, backdropFilter:'blur(4px)' }}>🔍 Fullscreen</div>
                  </div>
                ) : (
                  <div className="pg-no-photo">📷 No photos attached</div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    {/* Lightbox */}
    {lbxSrc && (
      <LightboxModal
        images={allImgs}
        index={allImgs.indexOf(lbxSrc)}
        onClose={() => setLbxSrc(null)}
      />
    )}
    </>
  );
}

export default function PublicComplaints({ complaints }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const filtered = useMemo(() => {
    let list = [...complaints];
    const q = search.toLowerCase();

    if (filter === 'unresolved') list = list.filter(c => !c.resolved);
    if (filter === 'resolved')   list = list.filter(c => c.resolved);

    if (q) list = list.filter(c =>
      c.id?.toLowerCase().includes(q) ||
      c.location?.toLowerCase().includes(q) ||
      c.ward?.toLowerCase().includes(q) ||
      c.desc?.toLowerCase().includes(q)
    );

    list.sort((a, b) => new Date(b.time) - new Date(a.time));
    return list;
  }, [complaints, filter, search]);

  const totalCount   = complaints.length;
  const pendingCount = complaints.filter(c => !c.resolved).length;
  const resolvedCount = complaints.filter(c => c.resolved).length;

  return (
    <div className="page pg-page">
      {/* Header */}
      <div className="pg-header">
        <div>
          <h1 className="sec-title">Public Gallery</h1>
          <div className="sec-sub">Reported issues &amp; resolution evidence</div>
        </div>
        <input
          className="sbox"
          placeholder="🔍 Search location, ward…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ minWidth: 0 }}
        />
      </div>

      {/* Summary Strip */}
      <div className="pg-summary">
        {[
          { v: totalCount,   l: 'Total',    c: 'var(--blue2)'   },
          { v: pendingCount, l: 'Pending',  c: 'var(--orange2)' },
          { v: resolvedCount,l: 'Resolved', c: 'var(--green2)'  },
        ].map((s, i) => (
          <div key={i} className="pg-sum-item">
            <div className="pg-sum-v" style={{ color: s.c }}>{s.v}</div>
            <div className="pg-sum-l">{s.l}</div>
          </div>
        ))}
      </div>

      {/* Filter chips */}
      <div className="filter-bar">
        <span className="filter-lbl">Filter:</span>
        {FILTER_OPTS.map(f => (
          <button
            key={f.key}
            className={`chip ${filter === f.key ? 'active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Grid column headers — hidden on mobile */}
      <div className="pg-col-hdr">
        <div>ID</div>
        <div>Category / Time</div>
        <div>Ward</div>
        <div>Status</div>
        <div></div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-ico">🔍</div>
          <div className="empty-state-t">No complaints found</div>
          <div className="empty-state-s">Try adjusting your filters or search terms</div>
        </div>
      ) : (
        <div className="pg-list">
          {filtered.map(c => (
            <PublicComplaintRow
              key={c.id}
              c={c}
              isExpanded={expandedId === c.id}
              onToggle={() => setExpandedId(expandedId === c.id ? null : c.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
