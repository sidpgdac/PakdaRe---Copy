import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WARDS } from '../../data/wardData';
import { timeAgo } from '../../utils/dateHelper';
import { SEV_BAR, LEVEL_COLORS } from '../../utils/constants';
import { generateReport } from '../../utils/generateReport';
import BeforeAfterSlider from '../ui/BeforeAfterSlider';
import LightboxModal from '../ui/LightboxModal';
import imageCompression from 'browser-image-compression';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';

const SEV_PILL  = { critical: 'p-crit', severe: 'p-sev', moderate: 'p-mod', minor: 'p-min' };
const SEV_LABEL = { critical: 'Critical', severe: 'Severe', moderate: 'Moderate', minor: 'Minor' };
const CATEGORIES = {
  'mosquito-nuisance': 'Mosquito Nuisance', 'breeding-stagnant': 'Stagnant Water',
  'breeding-garbage': 'Garbage Breeding', 'breeding-drain': 'Drain Breeding',
  'water-muddy': 'Contaminated Water', 'water-smell': 'Bad Water Smell',
  'water-leakage': 'Pipeline Leak', 'sewer-mix': 'Sewage Mix',
  'garbage': 'Garbage', 'drain-block': 'Blocked Drain',
  'fever-cluster': 'Fever Cluster', 'dengue-case': 'Dengue', 'malaria-case': 'Malaria',
};
const SEV_GRADIENT = { critical: 'var(--red)', severe: 'var(--orange)', moderate: 'var(--yellow)', minor: 'var(--green)' };

function HierarchyNode({ h, index, total }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      style={{ display: 'flex', alignItems: 'flex-start' }}
    >
      <div className="hier-node">
        <div className={`hier-av avl${h.level}`} title={h.role}>{h.initials}</div>
        <div className="hier-name">{h.role}</div>
        {h.name && <div style={{ fontSize: 8, color: 'var(--text-muted)', textAlign: 'center', marginTop: 2 }}>{h.name}</div>}
      </div>
      {index < total - 1 && <div className="hier-arr">→</div>}
    </motion.div>
  );
}

export default function ComplaintModal({ complaint: c, onClose, onResolveWithPhoto, onResolve }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [resPhoto, setResPhoto] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [gpsOk, setGpsOk]   = useState(false);
  const [officerName, setOfficerName] = useState('');
  const [compressing, setCompressing] = useState(false);
  const [showBeforeAfter, setShowBeforeAfter] = useState(false);
  const [lbxIdx, setLbxIdx] = useState(null); // null = closed
  const fileRef = useRef();

  // Build the full image list for lightbox (before + after + resolution)
  const allPhotos = [
    ...(c?.photos || []),
    ...(c?.resolutionPhoto ? [c.resolutionPhoto] : []),
  ];

  // Esc to close
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  if (!c) return null;

  const ward = WARDS.find(w => w.id === c.ward);
  const barColor = SEV_GRADIENT[c.severity] || 'var(--blue2)';

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCompressing(true);
    setGpsError('');
    setGpsOk(false);

    try {
      // Compress to < 500KB
      const compressed = await imageCompression(file, { maxSizeMB: 0.5, maxWidthOrHeight: 1200, useWebWorker: true });
      const reader = new FileReader();
      reader.onload = (ev) => {
        setResPhoto(ev.target.result);
        setCompressing(false);
      };
      reader.readAsDataURL(compressed);
    } catch (_) {
      setCompressing(false);
    }
  };

  const handleResolve = async () => {
    if (!resPhoto) {
      setGpsError(t('modal_upload_proof'));
      return;
    }
    setVerifying(true);
    setGpsError('');

    const result = await onResolveWithPhoto(c.id, resPhoto, officerName || ward?.wmo);
    setVerifying(false);

    if (result?.ok) {
      setGpsOk(true);
      setTimeout(onClose, 1200);
    } else {
      setGpsError(result?.error || 'Resolution failed');
    }
  };

  const handleDownloadPDF = async () => {
    await generateReport(c);
  };

  return (
    <>
      <div className="mov" onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div
        className="dbox"
        initial={{ opacity: 0, scale: 0.94, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 24 }}
        transition={{ type: 'spring', stiffness: 340, damping: 28 }}
      >
        {/* Severity bar */}
        <div className="dmod-sbar" style={{ background: `linear-gradient(90deg, ${barColor}, ${barColor}66)` }} />

        {/* Header */}
        <div className="dmod-hdr">
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--ff-display)', lineHeight: 1.2 }}>
              📍 {c.location}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              <span className={`pill ${SEV_PILL[c.severity] || 'p-mod'}`}>{SEV_LABEL[c.severity]}</span>
              <span className="pill p-cat">{CATEGORIES[c.category] || c.category}</span>
              {c.resolved ? <span className="pill p-done">✅ Resolved</span> : <span className="pill p-prog">⏳ {c.status}</span>}
              {c.lat && <span className="pill p-gps">📡 GPS</span>}
              {c.gpsVerified && <span style={{ padding: '3px 10px', borderRadius: 'var(--r-full)', fontSize: 10, fontWeight: 700, background: 'rgba(16,185,129,0.15)', color: 'var(--green2)', border: '1px solid rgba(16,185,129,0.3)' }}>✓ GPS Verified</span>}
            </div>
          </div>
          <button className="mclose" onClick={onClose}>✕</button>
        </div>

        <div className="dmod-body">
          {/* Details */}
          <div className="dmod-sec">
            <div className="dmod-sec-t">📋 Complaint Details</div>
            {[
              ['Complaint ID', <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 12 }}>{c.id}</span>],
              ['Ward', `${ward?.name} — ${ward?.area}`],
              ['Category', CATEGORIES[c.category] || c.category],
              ['Filed', timeAgo(c.time)],
              ['Assigned To', c.assignedTo || 'Pending'],
              ...(c.lat ? [['GPS Coords', <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 11 }}>{c.lat}, {c.lng}</span>]] : []),
              ...(c.resolvedAt ? [['Resolved At', timeAgo(c.resolvedAt)]] : []),
              ...(c.resolutionOfficer ? [['Resolved By', c.resolutionOfficer]] : []),
            ].map(([l, v], i) => (
              <div key={i} className="dmod-row">
                <span className="dmod-l">{l}</span>
                <span className="dmod-v">{v}</span>
              </div>
            ))}
          </div>

          {/* Description */}
          {c.desc && (
            <div className="dmod-sec">
              <div className="dmod-sec-t">📝 Description</div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65, background: 'var(--glass-bg)', borderRadius: 'var(--r12)', padding: '12px 16px', border: '1px solid var(--border)' }}>
                {c.desc}
              </p>
            </div>
          )}

          {/* PHOTOS — clickable thumbnail grid + Before/After slider */}
          {(c.photos?.length > 0 || c.resolutionPhoto) && (
            <div className="dmod-sec">
              <div className="dmod-sec-t">🖼️ Evidence Photos
                <span style={{ marginLeft: 8, fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 }}>Tap photo for fullscreen</span>
              </div>

              {/* Multi-photo thumbnail grid */}
              {c.photos?.length > 0 && (
                <div className="cm-photo-grid">
                  {c.photos.map((src, idx) => (
                    <div key={idx} className="cm-photo-thumb" onClick={() => setLbxIdx(idx)}>
                      <img src={src} alt={`Evidence ${idx + 1}`} />
                      <div className="cm-photo-zoom">🔍</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Before/After slider if resolved */}
              {c.resolved && c.photos?.[0] && c.resolutionPhoto && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Before / After</div>
                    <button onClick={() => setShowBeforeAfter(s => !s)}
                      style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 'var(--r-full)', border: '1px solid var(--border2)', background: 'var(--glass-bg2)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      {showBeforeAfter ? '▲ Hide' : '▼ Show slider'}
                    </button>
                  </div>
                  <AnimatePresence>
                    {showBeforeAfter && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                        <div style={{ position: 'relative' }}>
                          <BeforeAfterSlider beforeSrc={c.photos[0]} afterSrc={c.resolutionPhoto} height={200} />
                          <button
                            onClick={() => setLbxIdx(c.photos.length)} // index of resolutionPhoto in allPhotos
                            style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer', backdropFilter: 'blur(4px)' }}
                          >🔍 Fullscreen</button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Resolution photo standalone */}
              {c.resolved && c.resolutionPhoto && !c.photos?.[0] && (
                <div className="cm-photo-thumb" style={{ maxWidth: 240 }} onClick={() => setLbxIdx(0)}>
                  <img src={c.resolutionPhoto} alt="Resolution" />
                  <div className="cm-photo-zoom">🔍</div>
                </div>
              )}
            </div>
          )}

          {/* Accountability Chain */}
          {c.hierarchy?.length > 0 && (
            <div className="dmod-sec">
              <div className="dmod-sec-t">🔗 Accountability Chain</div>
              <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
                <div className="hier-chain" style={{ minWidth: 'max-content', padding: '12px 4px' }}>
                  {c.hierarchy.map((h, i) => (
                    <HierarchyNode key={i} h={h} index={i} total={c.hierarchy.length} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Escalation Trail */}
          {c.escalations?.length > 0 && (
            <div className="dmod-sec">
              <div className="dmod-sec-t">⚡ Escalation Trail</div>
              <div className="esc-trail" style={{ background: 'none', padding: 0, border: 'none' }}>
                {c.escalations.map((e, i) => (
                  <div key={i} className="esc-item"
                    style={{ borderLeftColor: i === c.escalations.length - 1 ? 'var(--blue2)' : 'var(--border)' }}>
                    {e}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PROOF-OF-RESOLUTION UPLOAD (anti-corruption) */}
          {!c.resolved && user && (
            <div className="dmod-sec">
              <div className="dmod-sec-t">📷 {t('modal_upload_proof')}</div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
                Upload a resolution photo taken <strong style={{ color: 'var(--orange2)' }}>at the complaint site</strong>. EXIF GPS will be extracted and validated against the original complaint coordinates (within 150m).
              </p>

              <input style={{ fontSize: 11, marginBottom: 2 }} value={officerName} onChange={e => setOfficerName(e.target.value)}
                placeholder="Officer name (optional)" className="fi" />

              <div
                style={{
                  border: `2px dashed ${resPhoto ? 'var(--green)' : gpsError ? 'var(--red)' : 'var(--border2)'}`,
                  borderRadius: 'var(--r16)', padding: 20, textAlign: 'center', cursor: 'pointer',
                  background: resPhoto ? 'rgba(16,185,129,0.05)' : 'var(--glass-bg)', marginTop: 10,
                  transition: 'all .25s', position: 'relative',
                }}
                onClick={() => fileRef.current?.click()}
              >
                <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFileUpload} />
                {compressing ? (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>⏳ Compressing photo…</div>
                ) : resPhoto ? (
                  <div>
                    <img src={resPhoto} alt="Resolution" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 'var(--r12)' }} />
                    <div style={{ fontSize: 11, color: 'var(--green2)', marginTop: 8, fontWeight: 700 }}>✓ Photo ready · Tap to change</div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: 32 }}>📷</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Tap to capture resolution photo</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>Auto-compressed · EXIF GPS extracted</div>
                  </div>
                )}
              </div>

              {/* GPS validation feedback */}
              <AnimatePresence>
                {gpsError && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    style={{ fontSize: 12, color: 'var(--red2)', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 'var(--r8)', padding: '10px 14px', marginTop: 10 }}>
                    🚫 {gpsError}
                  </motion.div>
                )}
                {gpsOk && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                    style={{ fontSize: 12, color: 'var(--green2)', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 'var(--r8)', padding: '10px 14px', marginTop: 10 }}>
                    ✅ GPS Verified — Complaint marked resolved!
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
            {!c.resolved && user && (
              <button
                className="btn-v"
                style={{ flex: 1, padding: '11px 18px', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                onClick={handleResolve}
                disabled={verifying || !resPhoto}
              >
                {verifying ? (
                  <><div className="spinner" />{t('modal_verifying')}</>
                ) : (
                  `✅ ${t('modal_mark_resolved')}`
                )}
              </button>
            )}
            {c.resolved && c.resolutionPhoto && (
              <button
                className="bp"
                style={{ flex: 1, padding: '11px 18px', fontSize: 13 }}
                onClick={handleDownloadPDF}
              >
                📄 {t('modal_download_pdf')}
              </button>
            )}
            {user && (
              <button className="btn-nr" style={{ flex: 1, padding: '11px 18px', fontSize: 13 }} onClick={onClose}>
                🚨 {t('modal_escalate')}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>

      {/* Fullscreen Lightbox */}
      {lbxIdx !== null && allPhotos.length > 0 && (
        <LightboxModal
          images={allPhotos}
          index={lbxIdx}
          onClose={() => setLbxIdx(null)}
        />
      )}
    </>
  );
}
