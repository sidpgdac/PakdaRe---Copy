import { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import imageCompression from 'browser-image-compression';
import * as turf from '@turf/turf';
import { WARDS, ROUTE_MAP } from '../../data/wardData';
import { useGamification, getLevel, getLevelProgress, BADGES } from '../../hooks/useGamification';
import { useAuth } from '../../context/AuthContext';

const haptic = {
  light:   () => navigator.vibrate && navigator.vibrate(20),
  medium:  () => navigator.vibrate && navigator.vibrate(40),
  success: () => navigator.vibrate && navigator.vibrate([30, 60, 40]),
  error:   () => navigator.vibrate && navigator.vibrate([50, 40, 50, 40, 50]),
};

// Grouped with severity so UI can show hierarchy
const CATEGORY_GROUPS = [
  {
    key: 'emergency',
    label: '🚨 Emergency',
    className: 'emergency',
    categories: [
      { key: 'dengue-case',   icon: '🏥', label: 'Dengue Case' },
      { key: 'malaria-case',  icon: '🩺', label: 'Malaria Case' },
      { key: 'fever-cluster', icon: '🤒', label: 'Fever Cluster' },
    ],
  },
  {
    key: 'vector',
    label: '🦟 Vector / Breeding',
    className: 'vector',
    categories: [
      { key: 'mosquito-nuisance', icon: '🦟', label: 'Mosquito' },
      { key: 'breeding-stagnant', icon: '💧', label: 'Stagnant Water' },
      { key: 'breeding-garbage',  icon: '🗑️', label: 'Garbage Site' },
      { key: 'breeding-drain',    icon: '🚿', label: 'Drain Breeding' },
    ],
  },
  {
    key: 'water',
    label: '💧 Water-borne',
    className: 'water',
    categories: [
      { key: 'water-muddy',   icon: '🥤', label: 'Bad Water' },
      { key: 'water-leakage', icon: '🔧', label: 'Pipe Leak' },
      { key: 'sewer-mix',     icon: '⚠️', label: 'Sewage Mix' },
    ],
  },
  {
    key: 'sanitation',
    label: '♻️ Sanitation',
    className: 'sanitation',
    categories: [
      { key: 'garbage',    icon: '♻️', label: 'Garbage' },
      { key: 'drain-block', icon: '🚫', label: 'Blocked Drain' },
    ],
  },
];

const ALL_CATEGORIES = CATEGORY_GROUPS.flatMap(g => g.categories);

const SEV_OPTS = [
  { key: 'minor',    emoji: '🟢', label: 'Minor',    desc: 'General upkeep (e.g. Garbage, cleaning)', sla: '48h', color: 'var(--green)' },
  { key: 'moderate', emoji: '🟡', label: 'Moderate', desc: 'Active nuisance (e.g. Pests, leakages)', sla: '24h', color: 'var(--yellow)' },
  { key: 'severe',   emoji: '🟠', label: 'Severe',   desc: 'Visible breeding in stagnant water', sla: '12h', color: 'var(--orange)' },
  { key: 'critical', emoji: '🔴', label: 'Critical', desc: 'Medical Emergency (e.g. Fever cluster)', sla: '4h',  color: 'var(--red)' },
];

const STEPS = ['What?', 'Where?', 'Details', 'Review'];

const mkId = () => {
  const d = new Date();
  const dateStr = `${d.getDate().toString().padStart(2,'0')}${(d.getMonth()+1).toString().padStart(2,'0')}`;
  // Use crypto.randomUUID() for collision-free IDs; slice last 8 chars for readability
  const unique = (crypto.randomUUID?.() || Math.random().toString(36).slice(2)).replace(/-/g,'').slice(0, 8).toUpperCase();
  return `BMC-${dateStr}-${unique}`;
};

function StepBar({ step }) {
  return (
    <div className="wiz-bar">
      {STEPS.map((label, i) => (
        <div key={i} className={`wiz-step${i < step ? ' done' : i === step ? ' active' : ''}`}>
          <div className="wiz-dot">{i < step ? '✓' : i + 1}</div>
          <div className="wiz-dot-lbl">{label}</div>
          {i < STEPS.length - 1 && <div className="wiz-line" />}
        </div>
      ))}
    </div>
  );
}

// DUPLICATE DETECTION: find nearby complaints within 100m of same category
function findNearby(complaints, lat, lng, category) {
  if (!lat || !lng || !complaints?.length) return [];
  const pt = turf.point([lng, lat]);
  return complaints.filter(c => {
    if (!c.lat || !c.lng) return false;
    if (c.resolved) return false;
    if (c.category !== category) return false;
    const dist = turf.distance(pt, turf.point([c.lng, c.lat]), { units: 'meters' });
    return dist <= 100;
  }).slice(0, 3);
}

export default function FileReport({ onSubmit, showToast, isModal, complaints = [] }) {
  const { t } = useTranslation();
  const locationState = useLocation().state;
  const asOfficer     = !!locationState?.asOfficer;
  const { user, staffProfile } = useAuth();
  const { profile, awardPoints } = useGamification();

  const [step,        setStep]        = useState(0);
  const [cat,         setCat]         = useState('');
  const [sev,         setSev]         = useState('');
  const [gpsState,    setGpsState]    = useState('loading');
  const [lat,         setLat]         = useState(null);
  const [lng,         setLng]         = useState(null);
  const [acc,         setAcc]         = useState(null);
  const [ward,        setWard]        = useState('');
  const [addr,        setAddr]        = useState('');
  const [desc,        setDesc]        = useState('');
  const [phone,       setPhone]       = useState('');
  const [photos,      setPhotos]      = useState([]);
  const [submitting,  setSubmitting]  = useState(false);
  const [done,        setDone]        = useState(false);
  const [newId,       setNewId]       = useState('');
  const [copied,      setCopied]      = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null); // null | 0-100
  const [dupWarning,  setDupWarning]  = useState(false);
  const [dupDismissed,setDupDismissed]= useState(false);
  const [earnedPoints,setEarnedPoints]= useState(0);
  const [newBadges,   setNewBadges]   = useState([]);
  const cameraRef = useRef(null);
  const fileRef   = useRef(null);

  // Nearby duplicate complaints when GPS + category both set
  const nearbyDups = useMemo(() => {
    if (!lat || !lng || !cat) return [];
    return findNearby(complaints, lat, lng, cat);
  }, [complaints, lat, lng, cat]);

  useEffect(() => {
    if (nearbyDups.length > 0 && step === 0 && !dupDismissed) setDupWarning(true);
    else setDupWarning(false);
  }, [nearbyDups, step, dupDismissed]);

  /* GPS */
  const requestGPS = () => {
    setGpsState('loading');
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        const _lat = parseFloat(pos.coords.latitude.toFixed(5));
        const _lng = parseFloat(pos.coords.longitude.toFixed(5));
        setLat(_lat); setLng(_lng); setAcc(Math.round(pos.coords.accuracy));
        setGpsState('ok');
        let nearest = ''; let minDist = Infinity;
        for (let w of WARDS) {
          if (!w.lat || !w.lng) continue;
          const d = (w.lat - _lat) ** 2 + (w.lng - _lng) ** 2;
          if (d < minDist) { minDist = d; nearest = w.id; }
        }
        if (nearest) setWard(nearest);
      },
      () => setGpsState('error'),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };
  useEffect(() => { requestGPS(); }, []);

  /* Auto-save draft */
  useEffect(() => {
    if (step >= 2) {
      localStorage.setItem('pakdare_draft', JSON.stringify({ cat, sev, ward, addr, step }));
    }
  }, [step, cat, sev, ward, addr]);

  /* Photo upload with compression + progress feedback */
  const readFiles = async (files) => {
    setUploadProgress(0);
    const fileArr = Array.from(files);
    const results = [];
    for (let i = 0; i < fileArr.length; i++) {
      try {
        const compressed = await imageCompression(fileArr[i], {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1280,
          useWebWorker: true,
          onProgress: (p) => setUploadProgress(Math.round(((i / fileArr.length) + (p / 100) / fileArr.length) * 100)),
        });
        const reader = new FileReader();
        await new Promise(res => {
          reader.onload = (ev) => { results.push(ev.target.result); res(); };
          reader.readAsDataURL(compressed);
        });
      } catch {
        const reader = new FileReader();
        await new Promise(res => {
          reader.onload = (ev) => { results.push(ev.target.result); res(); };
          reader.readAsDataURL(fileArr[i]);
        });
      }
    }
    setPhotos(prev => [...prev, ...results]);
    setUploadProgress(null);
  };
  const removePhoto = (i) => setPhotos(prev => prev.filter((_, j) => j !== i));

  /* Navigation */
  const canNext = [
    cat && sev,
    ward,
    desc.trim().length > 8,
    true,
  ][step];

  const next = () => {
    if (!canNext) {
      const msgs = [
        'Please pick a category and severity',
        'Please select a ward',
        'Please write a short description (min 8 chars)',
      ];
      haptic.error();
      showToast('⚠️ ' + (msgs[step] || ''), 'warn');
      return;
    }
    haptic.light();
    setStep(s => s + 1);
  };
  const back = () => { haptic.light(); setStep(s => Math.max(0, s - 1)); };

  /* Submit */
  const submit = () => {
    haptic.medium();
    setSubmitting(true);
    const id = mkId();
    setTimeout(() => {
      const wardObj    = WARDS.find(w => w.id === ward);
      const route      = ROUTE_MAP[cat];
      const officerTag = asOfficer && (staffProfile?.name || user?.email?.split('@')[0]);
      const complaintData = {
        id, ward,
        location:   addr || `${wardObj?.area || ward} area`,
        lat:        lat ?? wardObj?.lat,
        lng:        lng ?? wardObj?.lng,
        category:   cat, severity: sev, 
        desc:       phone ? `${desc.trim()}\n\nContact: ${phone}` : desc.trim(), 
        status:     'Open',
        assignedTo: wardObj ? `${wardObj.siTeam?.[0]?.name || 'Staff'} (S.I.)` : 'Pending Assignment',
        time:       new Date().toISOString(),
        resolved:   false, isDemo: false,
        escalations: [`${asOfficer ? 'Officer' : 'Citizen'} Filed → Assigned to ${wardObj?.siTeam?.[0]?.name || 'Sanitary Inspector'} (Just now)`],
        hierarchy: [
          { role: 'S.I.',    name: wardObj?.siTeam?.[0]?.name || 'Sanitary Inspector', level: 4, status: 'Active' },
          { role: 'M.O.H.',  name: wardObj?.wmo || 'Medical Officer',    level: 3, status: 'Pending' },
          { role: 'AHO',     name: 'Dr. Sachin Bhosle',                 level: 2, status: 'Pending' }, 
          { role: 'DEHO',    name: 'Dr. Varsha Puri',                   level: 1, status: 'Pending' },
        ],
        photos,
      };
      onSubmit(complaintData);

      // Award gamification points (citizen only — officers have performance score)
      if (!asOfficer) {
        const pts = awardPoints(complaintData);
        setEarnedPoints(pts);
        // Capture new badges from the profile update
        setTimeout(() => {
          // Read latest profile for new badges
          setNewBadges(prev => prev); // will be updated by profile.lastEarned
        }, 50);
      }

      localStorage.removeItem('pakdare_draft');
      setNewId(id); setSubmitting(false); setDone(true);
    }, 1200);
  };

  useEffect(() => {
    if (done) haptic.success();
    // No confetti — disease/health context; success screen is sufficient feedback
  }, [done]);

  const reset = () => {
    haptic.light();
    setStep(0); setCat(''); setSev(''); setWard(''); setAddr(''); setPhone('');
    setDesc(''); setPhotos([]); setDone(false); setNewId(''); setCopied(false);
    setDupWarning(false); setDupDismissed(false);
    setEarnedPoints(0); setNewBadges([]);
    requestGPS();
  };

  const copyId = () => {
    haptic.light();
    navigator.clipboard?.writeText(newId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const shareId = () => {
    haptic.light();
    if (navigator.share) {
      navigator.share({ title: 'BMC Complaint ID', text: `My BMC complaint ID: ${newId}\nTrack at: ${window.location.origin}/track/${newId}`, url: `${window.location.origin}/track/${newId}` });
    } else {
      copyId();
    }
  };

  /* ── SUCCESS SCREEN ───────────────────────────────────────────── */
  if (done) return (
    <div className={isModal ? '' : 'page'}>
      {!isModal && <div className="page-hdr"><h1 className="page-title">File a New Report</h1></div>}
      <div className="form-wrap">
        <motion.div className="wiz-success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
          <motion.div className="wiz-success-ico"
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.1 }}>
            ✅
          </motion.div>
          <h2 className="wiz-success-title">Report Submitted!</h2>
          <p className="wiz-success-sub">Auto-routed to the responsible officer chain.</p>

          {/* Gamification reward — citizen only */}
          {!asOfficer && earnedPoints > 0 && (
            <motion.div
              className="wiz-points-earned"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.3 }}
            >
              <div className="wiz-points-burst">+{earnedPoints} pts</div>
              <div className="wiz-points-level">
                {getLevel(profile.points).icon} {getLevel(profile.points).name}
                <span style={{ opacity: 0.7, fontSize: 12 }}> · {profile.points} total pts</span>
              </div>
              {profile.lastEarned?.badges?.length > 0 && (
                <div className="wiz-badges-earned">
                  {profile.lastEarned.badges.map(bid => {
                    const b = BADGES.find(x => x.id === bid);
                    return b ? (
                      <div key={bid} className="wiz-badge-item">
                        <span>{b.icon}</span> <strong>{b.name}</strong> unlocked!
                      </div>
                    ) : null;
                  })}
                </div>
              )}
            </motion.div>
          )}

          <div className="wiz-id-box">
            <div className="wiz-id-label">Your Complaint ID</div>
            <div className="wiz-id-val">{newId}</div>
            <div className="wiz-id-actions">
              <button className="wiz-id-copy" onClick={copyId}>{copied ? '✓ Copied!' : '📋 Copy ID'}</button>
              <button className="wiz-id-share" onClick={shareId}>📤 Share</button>
            </div>
          </div>

          <div className="wiz-success-route">
            {ROUTE_MAP[cat] && (
              <>
                <div className="wiz-success-route-l">📬 Auto-routed to</div>
                <div className="wiz-success-route-v">{ROUTE_MAP[cat]}</div>
              </>
            )}
          </div>

          <Link to={`/track/${newId}`} className="btn-primary" style={{ marginTop: 12, width: '100%', justifyContent: 'center', textDecoration: 'none' }}>
            🔍 Track This Complaint
          </Link>

          <button className="btn-ghost" onClick={reset} style={{ marginTop: 10, width: '100%', justifyContent: 'center' }}>
            ➕ Submit Another Report
          </button>
        </motion.div>
      </div>
    </div>
  );

  /* ── WIZARD ───────────────────────────────────────────────────── */
  const wardObj = WARDS.find(w => w.id === ward);
  const catObj  = ALL_CATEGORIES.find(c => c.key === cat);
  const sevObj  = SEV_OPTS.find(s => s.key === sev);
  const route   = ward && cat ? ROUTE_MAP[cat] : null;

  return (
    <div className={isModal ? '' : 'page'}>
      {!isModal && (
        <div className="page-hdr">
          <h1 className="page-title">{asOfficer ? 'Officer Report' : 'File a New Report'}</h1>
          <p className="page-sub">
            {asOfficer
              ? `Filed as: ${staffProfile?.name || user?.email?.split('@')[0] || 'Officer'} · ${staffProfile?.designation || 'Field Officer'}`
              : 'Anonymous · GPS-tagged · Auto-routed'}
          </p>
        </div>
      )}

      <div className="form-wrap">
        <div className="fcard wiz-card">
          <StepBar step={step} />

          {step >= 1 && (
            <div className={`gps-strip ${gpsState === 'loading' ? 'loading' : gpsState === 'error' ? 'error' : ''}`}>
              <span style={{ fontSize: 18 }}>📍</span>
              <span style={{ flex: 1, fontSize: 13 }}>
                {gpsState === 'loading' && 'Detecting GPS…'}
                {gpsState === 'ok'      && `✓ ${lat?.toFixed(4)}, ${lng?.toFixed(4)} · ±${acc}m`}
                {gpsState === 'error'   && 'GPS unavailable — select ward manually'}
              </span>
              <button onClick={requestGPS} className="gps-retry">Re-locate</button>
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.2 }}
              className="wiz-body"
            >

              {/* ════ STEP 0: WHAT? ════ */}
              {step === 0 && (
                <div>
                  <div className="wiz-step-title">What's the issue?</div>

                  {/* Duplicate warning */}
                  {dupWarning && nearbyDups.length > 0 && (
                    <div className="dup-warning">
                      <span className="dup-warning-icon">⚠️</span>
                      <div className="dup-warning-text">
                        <div className="dup-warning-title">
                          {nearbyDups.length} similar report{nearbyDups.length > 1 ? 's' : ''} already filed nearby
                        </div>
                        <div className="dup-warning-sub">
                          {nearbyDups[0].id} — {nearbyDups[0].location} · {nearbyDups[0].status}
                        </div>
                        <div className="dup-warning-actions">
                          <button className="dup-action-btn" onClick={() => { setDupWarning(false); setDupDismissed(true); }}>
                            Still file mine
                          </button>
                          <Link to={`/track/${nearbyDups[0].id}`} className="dup-action-btn confirm">
                            Track existing →
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Categorised grid with group headers */}
                  {CATEGORY_GROUPS.map(group => (
                    <div key={group.key}>
                      <div className={`cat-group-hdr ${group.className}`}>{group.label}</div>
                      <div className="cat-grid" style={{ marginBottom: 4 }}>
                        {group.categories.map(c => (
                          <button
                            key={c.key}
                            className={`cat-card${cat === c.key ? ' active' : ''}`}
                            onClick={() => { haptic.light(); setCat(c.key); setDupDismissed(false); }}
                          >
                            <span className="cat-ico">{c.icon}</span>
                            <span className="cat-lbl">{c.label}</span>
                            {cat === c.key && <span className="cat-check">✓</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div className="wiz-step-title" style={{ marginTop: 20 }}>{t('how_serious')}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, marginTop: -8 }}>
                    {t('sev_hint')}
                  </div>
                  <div className="sev-big-grid">
                    {SEV_OPTS.map(o => (
                      <button
                        key={o.key}
                        className={`sev-big${sev === o.key ? ' active' : ''}`}
                        style={sev === o.key ? { borderColor: o.color, background: `${o.color}12` } : {}}
                        onClick={() => { haptic.light(); setSev(o.key); }}
                      >
                        <div className="sev-big-ico">{o.emoji}</div>
                        <div style={{ flex: 1, textAlign: 'left' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span className="sev-big-lbl">{t(o.key)}</span>
                            <span style={{ fontSize: 10, fontWeight: 800, opacity: 0.7, background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: 4 }}>
                              {t('sla_label')}: {o.sla}
                            </span>
                          </div>
                          <div className="sev-big-desc" style={{ fontSize: 11, marginTop: 2, lineHeight: 1.3 }}>{t(`sev_${o.key}_desc`)}</div>
                        </div>
                        {sev === o.key && <span className="sev-big-check" style={{ color: o.color }}>✓</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ════ STEP 1: WHERE? ════ */}
              {step === 1 && (
                <div>
                  <div className="wiz-step-title">Where is the issue?</div>

                  {gpsState === 'ok' && ward && (
                    <div className="wiz-gps-banner">
                      <span>📍</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>Nearest ward auto-detected</div>
                        <div style={{ fontSize: 12, opacity: 0.8 }}>{wardObj?.full || ward}</div>
                      </div>
                      <span style={{ color: 'var(--green2)', fontWeight: 700 }}>✓</span>
                    </div>
                  )}

                  <div className="fg" style={{ marginBottom: 14 }}>
                    <label className="flbl">Ward</label>
                    <select className="fsl" value={ward} onChange={e => setWard(e.target.value)}>
                      <option value="">— Select Ward —</option>
                      {WARDS.map(w => <option key={w.id} value={w.id}>{w.id} — {w.area}</option>)}
                    </select>
                  </div>

                  <div className="fg">
                    <label className="flbl">Address / Landmark</label>
                    <input
                      className="fi"
                      value={addr}
                      onChange={e => setAddr(e.target.value)}
                      placeholder="e.g. Near Marol Naka, opp. SBI branch…"
                    />
                  </div>

                  {route && (
                    <div className="route-box" style={{ marginTop: 16 }}>
                      <div className="route-l">🔀 Your report routes to</div>
                      <div className="route-v">{route}</div>
                    </div>
                  )}
                </div>
              )}

              {/* ════ STEP 2: DETAILS ════ */}
              {step === 2 && (
                <div>
                  <div className="wiz-step-title">Describe the issue</div>

                  <div className="fg" style={{ marginBottom: 16 }}>
                    <label className="flbl">Description <span style={{ color: 'var(--text-muted)' }}>(min 8 chars)</span></label>
                    <textarea
                      className="ftx"
                      value={desc}
                      onChange={e => setDesc(e.target.value)}
                      placeholder="Landmarks, number of people affected, duration, visible symptoms…"
                      style={{ minHeight: 110 }}
                    />
                    <div style={{ fontSize: 11, color: desc.length > 8 ? 'var(--green2)' : 'var(--text-muted)', marginTop: 4 }}>
                      {desc.length} chars {desc.length > 8 ? '✓' : '(min 8)'}
                    </div>
                  </div>

                  <div className="fg" style={{ marginBottom: 16 }}>
                    <label className="flbl">📱 Mobile Number <span style={{ color: 'var(--text-muted)' }}>(optional · for status updates)</span></label>
                    <input
                      className="fi"
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                      maxLength={15}
                    />
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                      We'll contact you when your complaint is resolved.
                    </div>
                  </div>

                  <label className="flbl">📷 Photo Evidence <span style={{ color: 'var(--text-muted)' }}>(optional)</span></label>

                  <div className="photo-cta-row">
                    <input ref={cameraRef} type="file" accept="image/*" capture="environment" multiple
                      style={{ display: 'none' }} onChange={e => readFiles(e.target.files)} />
                    <input ref={fileRef} type="file" accept="image/*" multiple
                      style={{ display: 'none' }} onChange={e => readFiles(e.target.files)} />

                    <button className="photo-cta-cam" onClick={() => cameraRef.current?.click()} disabled={uploadProgress !== null}>
                      <span style={{ fontSize: 22 }}>📷</span>
                      <span>Take Photo</span>
                    </button>
                    <button className="photo-cta-gal" onClick={() => fileRef.current?.click()} disabled={uploadProgress !== null}>
                      <span style={{ fontSize: 22 }}>🖼️</span>
                      <span>Gallery</span>
                    </button>
                  </div>

                  {/* Upload progress bar */}
                  {uploadProgress !== null && (
                    <div className="photo-upload-progress">
                      <div className="photo-upload-label">
                        <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                        Compressing photo… {uploadProgress}%
                      </div>
                      <div className="photo-upload-track">
                        <div className="photo-upload-fill" style={{ width: `${uploadProgress}%` }} />
                      </div>
                    </div>
                  )}

                  {photos.length > 0 && (
                    <div className="photo-grid" style={{ marginTop: 12 }}>
                      {photos.map((src, i) => (
                        <div key={i} className="photo-item">
                          <img src={src} alt={`upload-${i}`} />
                          <button className="photo-rm" onClick={() => removePhoto(i)}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ════ STEP 3: REVIEW ════ */}
              {step === 3 && (
                <div>
                  <div className="wiz-step-title">Review your report</div>
                  <div className="wiz-review-card">
                    <div className="wiz-review-row">
                      <span className="wiz-review-l">Category</span>
                      <span className="wiz-review-v">{catObj?.icon} {catObj?.label}</span>
                    </div>
                    <div className="wiz-review-row">
                      <span className="wiz-review-l">Severity</span>
                      <span className="wiz-review-v">{sevObj?.emoji} {sevObj?.label}</span>
                    </div>
                    <div className="wiz-review-row">
                      <span className="wiz-review-l">Ward</span>
                      <span className="wiz-review-v">{wardObj?.full || ward}</span>
                    </div>
                    {addr && (
                      <div className="wiz-review-row">
                        <span className="wiz-review-l">Location</span>
                        <span className="wiz-review-v">{addr}</span>
                      </div>
                    )}
                    {gpsState === 'ok' && (
                      <div className="wiz-review-row">
                        <span className="wiz-review-l">GPS</span>
                        <span className="wiz-review-v">📍 {lat?.toFixed(4)}, {lng?.toFixed(4)} ±{acc}m</span>
                      </div>
                    )}
                    <div className="wiz-review-row" style={{ alignItems: 'flex-start' }}>
                      <span className="wiz-review-l">Description</span>
                      <span className="wiz-review-v" style={{ whiteSpace: 'pre-wrap' }}>{desc}</span>
                    </div>
                    {photos.length > 0 && (
                      <div className="wiz-review-row">
                        <span className="wiz-review-l">Photos</span>
                        <span className="wiz-review-v">{photos.length} attached</span>
                      </div>
                    )}
                    {phone && (
                      <div className="wiz-review-row">
                        <span className="wiz-review-l">Mobile</span>
                        <span className="wiz-review-v">📱 {phone}</span>
                      </div>
                    )}
                    {asOfficer && (
                      <div className="wiz-review-row" style={{ background: 'rgba(16,185,129,0.06)', borderRadius: 'var(--r12)', padding: '10px 14px', marginTop: 8 }}>
                        <span className="wiz-review-l">Filed by</span>
                        <span className="wiz-review-v" style={{ color: 'var(--green2)' }}>
                          👷 {staffProfile?.name || user?.email?.split('@')[0]} (Officer)
                        </span>
                      </div>
                    )}
                    {route && (
                      <div className="wiz-review-row" style={{ background: 'rgba(37,99,235,0.06)', borderRadius: 'var(--r12)', padding: '10px 14px', marginTop: 8 }}>
                        <span className="wiz-review-l">Routes to</span>
                        <span className="wiz-review-v" style={{ color: 'var(--blue2)' }}>{route}</span>
                      </div>
                    )}
                    {sev === 'critical' || sev === 'severe' ? (
                      <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 'var(--r8)', background: 'rgba(234,0,41,0.08)', border: '1px solid rgba(234,0,41,0.2)', fontSize: 11, color: 'var(--red2)' }}>
                        ⏱️ SLA: {sev === 'critical' ? '4 hours' : '12 hours'} response time
                      </div>
                    ) : null}
                  </div>
                  <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', marginTop: 10 }}>
                    🔒 Anonymous · GPS-tagged · Auto-routed to responsible officer chain
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="wiz-nav">
            {step > 0 ? (
              <button className="wiz-back" onClick={back}>← Back</button>
            ) : <div />}

            {step < 3 ? (
              <button className={`wiz-next${canNext ? '' : ' dim'}`} onClick={next}>
                Next →
              </button>
            ) : (
              <button className="btn-sub wiz-submit" onClick={submit} disabled={submitting}>
                {submitting ? <><div className="spinner" />Submitting…</> : <>Submit Report 🚀</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
