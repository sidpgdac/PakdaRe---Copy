import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { WARDS, ROUTE_MAP } from '../../data/wardData';

/* ── HAPTIC FEEDBACK ──────────────────────────────────────────────── */
const haptic = {
  light:   () => navigator.vibrate && navigator.vibrate(20),
  medium:  () => navigator.vibrate && navigator.vibrate(40),
  success: () => navigator.vibrate && navigator.vibrate([30, 60, 40]),
  error:   () => navigator.vibrate && navigator.vibrate([50, 40, 50, 40, 50]),
};

/* ── Data ─────────────────────────────────────────────────────────── */
const CATEGORIES = [
  { key: 'mosquito-nuisance',  icon: '🦟', label: 'Mosquito',      group: 'Vector-borne' },
  { key: 'breeding-stagnant',  icon: '💧', label: 'Stagnant Water', group: 'Vector-borne' },
  { key: 'breeding-garbage',   icon: '🗑️', label: 'Garbage Site',  group: 'Vector-borne' },
  { key: 'breeding-drain',     icon: '🚿', label: 'Drain Breeding', group: 'Vector-borne' },
  { key: 'water-muddy',        icon: '🥤', label: 'Bad Water',      group: 'Water-borne' },
  { key: 'water-leakage',      icon: '🔧', label: 'Pipe Leak',      group: 'Water-borne' },
  { key: 'sewer-mix',          icon: '⚠️', label: 'Sewage Mix',    group: 'Water-borne' },
  { key: 'garbage',            icon: '♻️', label: 'Garbage',        group: 'Sanitation' },
  { key: 'drain-block',        icon: '🚫', label: 'Blocked Drain',  group: 'Sanitation' },
  { key: 'fever-cluster',      icon: '🤒', label: 'Fever Cluster',  group: 'Disease' },
  { key: 'dengue-case',        icon: '🏥', label: 'Dengue',         group: 'Disease' },
  { key: 'malaria-case',       icon: '🩺', label: 'Malaria',        group: 'Disease' },
];

const SEV_OPTS = [
  { key: 'minor',    emoji: '🟢', label: 'Minor',    desc: 'Low risk',     color: 'var(--green)' },
  { key: 'moderate', emoji: '🟡', label: 'Moderate', desc: 'Needs action', color: 'var(--yellow)' },
  { key: 'severe',   emoji: '🟠', label: 'Severe',   desc: 'Urgent',       color: 'var(--orange)' },
  { key: 'critical', emoji: '🔴', label: 'Critical', desc: 'Emergency!',   color: 'var(--red)' },
];

const STEPS = ['What?', 'Where?', 'Details', 'Review'];

const mkId = () => {
  const d = new Date();
  return `BMC-${d.getDate().toString().padStart(2,'0')}${(d.getMonth()+1).toString().padStart(2,'0')}-${Math.floor(1000+Math.random()*8999)}`;
};

/* ── Step progress bar ────────────────────────────────────────────── */
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

/* ── Main Component ─────────────────────────────────────────────────── */
export default function FileReport({ onSubmit, showToast, isModal }) {
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
  const [photos,      setPhotos]      = useState([]);
  const [submitting,  setSubmitting]  = useState(false);
  const [done,        setDone]        = useState(false);
  const [newId,       setNewId]       = useState('');
  const [copied,      setCopied]      = useState(false);
  const cameraRef = useRef(null);
  const fileRef   = useRef(null);

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

  /* Auto-save draft after step 2 */
  useEffect(() => {
    if (step >= 2) {
      localStorage.setItem('pakdare_draft', JSON.stringify({ cat, sev, ward, addr, step }));
    }
  }, [step, cat, sev, ward, addr]);

  /* Photos */
  const readFiles = (files) => {
    Array.from(files).forEach(f => {
      const reader = new FileReader();
      reader.onload = (ev) => setPhotos(prev => [...prev, ev.target.result]);
      reader.readAsDataURL(f);
    });
  };
  const removePhoto = (i) => setPhotos(prev => prev.filter((_, j) => j !== i));

  /* Navigation */
  const canNext = [
    cat && sev,           // Step 0: category + severity required
    ward,                  // Step 1: ward required
    desc.trim().length > 8, // Step 2: description
    true,                  // Step 3: review
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
      const wardObj = WARDS.find(w => w.id === ward);
      const route   = ROUTE_MAP[cat];
      onSubmit({
        id, ward,
        location: addr || `${wardObj?.area || ward} area`,
        lat: lat ?? wardObj?.lat, lng: lng ?? wardObj?.lng,
        category: cat, severity: sev, desc: desc.trim(), status: 'Open',
        assignedTo: wardObj ? `${wardObj.wmo} (WMO)` : 'Pending Assignment',
        time: new Date().toISOString(), resolved: false, isDemo: false,
        escalations: [`Filed → ${route?.split('→')[0]?.trim() || 'Ward Office'} (just now)`],
        hierarchy: [
          { role: 'Citizen', initials: 'CZ', level: 4 },
          { role: wardObj?.wmo?.split(' ')[0] || 'WMO', initials: 'WM', level: 2 },
        ],
        photos,
      });
      localStorage.removeItem('pakdare_draft');
      setNewId(id); setSubmitting(false); setDone(true);
    }, 1200);
  };

  useEffect(() => {
    if (done) {
      haptic.success();
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444']
      });
    }
  }, [done]);

  const reset = () => {
    haptic.light();
    setStep(0); setCat(''); setSev(''); setWard(''); setAddr('');
    setDesc(''); setPhotos([]); setDone(false); setNewId(''); setCopied(false);
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
      navigator.share({ title: 'BMC Complaint ID', text: `My BMC complaint ID: ${newId}\nTrack at: pakdare.bmc.gov.in`, url: window.location.origin });
    } else {
      copyId();
    }
  };

  /* ── SUCCESS SCREEN ─────────────────────────────────────────────── */
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
          <h2 className="wiz-success-title">Report Saved!</h2>
          <p className="wiz-success-sub">Auto-routed to the responsible officer chain.</p>

          <div className="wiz-id-box">
            <div className="wiz-id-label">Your Complaint ID</div>
            <div className="wiz-id-val">{newId}</div>
            <div className="wiz-id-actions">
              <button className="wiz-id-copy" onClick={copyId}>
                {copied ? '✓ Copied!' : '📋 Copy ID'}
              </button>
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

          <button className="btn-sub" onClick={reset} style={{ marginTop: 16 }}>
            ➕ Submit Another Report
          </button>
        </motion.div>
      </div>
    </div>
  );

  /* ── WIZARD FORM ────────────────────────────────────────────────── */
  const wardObj = WARDS.find(w => w.id === ward);
  const catObj  = CATEGORIES.find(c => c.key === cat);
  const sevObj  = SEV_OPTS.find(s => s.key === sev);
  const route   = ward && cat ? ROUTE_MAP[cat] : null;

  return (
    <div className={isModal ? '' : 'page'}>
      {!isModal && (
        <div className="page-hdr">
          <h1 className="page-title">File a New Report</h1>
          <p className="page-sub">Anonymous · GPS-tagged · Auto-routed</p>
        </div>
      )}

      <div className="form-wrap">
        <div className="fcard wiz-card">

          {/* Step bar */}
          <StepBar step={step} />

          {/* GPS strip — always visible on steps 1+ */}
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

          {/* ── ANIMATED STEP BODY ─────────────────────────────────── */}
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

                  {/* Category icon grid */}
                  <div className="cat-grid">
                    {CATEGORIES.map(c => (
                      <button
                        key={c.key}
                        className={`cat-card${cat === c.key ? ' active' : ''}`}
                        onClick={() => { haptic.light(); setCat(c.key); }}
                      >
                        <span className="cat-ico">{c.icon}</span>
                        <span className="cat-lbl">{c.label}</span>
                        {cat === c.key && <span className="cat-check">✓</span>}
                      </button>
                    ))}
                  </div>

                  {/* Severity — big buttons */}
                  <div className="wiz-step-title" style={{ marginTop: 20 }}>How serious?</div>
                  <div className="sev-big-grid">
                    {SEV_OPTS.map(o => (
                      <button
                        key={o.key}
                        className={`sev-big${sev === o.key ? ' active' : ''}`}
                        style={sev === o.key ? { borderColor: o.color, background: `${o.color}18` } : {}}
                        onClick={() => { haptic.light(); setSev(o.key); }}
                      >
                        <span className="sev-big-ico">{o.emoji}</span>
                        <div>
                          <div className="sev-big-lbl">{o.label}</div>
                          <div className="sev-big-desc">{o.desc}</div>
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

                  {/* Ward auto-detected indicator */}
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

                  {/* Route preview */}
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

                  {/* Photo section — camera first, then gallery */}
                  <label className="flbl">📷 Photo Evidence <span style={{ color: 'var(--text-muted)' }}>(optional)</span></label>

                  {/* Camera + gallery buttons */}
                  <div className="photo-cta-row">
                    <input ref={cameraRef} type="file" accept="image/*" capture="environment" multiple
                      style={{ display: 'none' }} onChange={e => readFiles(e.target.files)} />
                    <input ref={fileRef}   type="file" accept="image/*,video/*" multiple
                      style={{ display: 'none' }} onChange={e => readFiles(e.target.files)} />

                    <button className="photo-cta-cam" onClick={() => cameraRef.current?.click()}>
                      <span style={{ fontSize: 22 }}>📷</span>
                      <span>Take Photo</span>
                    </button>
                    <button className="photo-cta-gal" onClick={() => fileRef.current?.click()}>
                      <span style={{ fontSize: 22 }}>🖼️</span>
                      <span>Gallery</span>
                    </button>
                  </div>

                  {/* Photo preview grid */}
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
                    {route && (
                      <div className="wiz-review-row" style={{ background: 'rgba(37,99,235,0.06)', borderRadius: 'var(--r12)', padding: '10px 14px', marginTop: 8 }}>
                        <span className="wiz-review-l">Routes to</span>
                        <span className="wiz-review-v" style={{ color: 'var(--blue2)' }}>{route}</span>
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', marginTop: 10 }}>
                    🔒 Anonymous · GPS-tagged · Auto-routed to responsible officer chain
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>

          {/* ── NAVIGATION BUTTONS ─────────────────────────────────── */}
          <div className="wiz-nav">
            {step > 0 ? (
              <button className="wiz-back" onClick={back}>← Back</button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <button
                className={`wiz-next${canNext ? '' : ' dim'}`}
                onClick={next}
              >
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
