import { useState, useEffect } from 'react';

const MESSAGES = [
  'Connecting to BMC Health Network…',
  'Loading 27 Ward Data Points…',
  'Calibrating Disease Surveillance…',
  'Syncing Complaint Database…',
  'Activating GPS Tracking…',
  'System Ready.',
];

export default function LoadingScreen({ onEnter }) {
  const [progress, setProgress] = useState(0);
  const [msgIdx, setMsgIdx] = useState(0);
  const [ready, setReady] = useState(false);

  // Complete in ~1.4 seconds (100 steps × 14ms)
  useEffect(() => {
    const t = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(t);
          setReady(true);
          setTimeout(() => onEnter(), 400);
          return 100;
        }
        return Math.min(p + 2, 100);
      });
    }, 14);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cycle status messages
  useEffect(() => {
    const t = setInterval(
      () => setMsgIdx(i => Math.min(i + 1, MESSAGES.length - 1)),
      280
    );
    return () => clearInterval(t);
  }, []);

  return (
    <div className="ls-overlay">
      <div className="ls-bg">
        <div
          className="ls-bg-image"
          style={{
            backgroundImage:
              'url(https://images.unsplash.com/photo-1570168007204-dfb528c6958f?q=80&w=2574&auto=format&fit=crop)',
          }}
        />
        <div className="ls-bg-overlay" />
        <div className="ls-grid" />
        <div className="ls-mesh" style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.45) 0%, transparent 60%)', top: '10%', left: '30%', animationDuration: '15s' }} />
        <div className="ls-mesh" style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.3) 0%, transparent 60%)', top: '40%', left: '50%', animationDelay: '3s', animationDuration: '20s' }} />
      </div>

      <div className="ls-inner">
        <div className="ls-logo-wrap">
          <div className="ls-logo-ring" />
          <div className="ls-logo-ring2" />
          <img
            src="https://portal.mcgm.gov.in/com.mcgm.newframework/images/logo_V1.png"
            alt="MCGM"
            className="ls-logo"
            onError={e => {
              e.target.style.display = 'none';
              e.target.parentElement.innerHTML += '<span class="ls-logo-fb">बृ</span>';
            }}
          />
        </div>

        <div className="ls-badge">
          <div className="ls-badge-dot" />
          LIVE SURVEILLANCE
        </div>

        <h1 className="ls-title"><span className="ls-bmc">BMC</span> Public Health Portal</h1>
        <div className="ls-sub">Brihanmumbai Municipal Corporation • Disease Surveillance System</div>

        <div className="ls-progress-container" style={{ marginTop: 60 }}>
          <div className="ls-progress-info">
            <div className="ls-progress-msg">
              <span className="ls-shield">🛡️</span>{' '}
              {ready ? 'System Ready.' : MESSAGES[msgIdx]}
            </div>
            <div className="ls-pct">{Math.round(progress)}%</div>
          </div>
          <div className="ls-bar-wrap">
            <div className="ls-bar" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div className="ls-bottom-features">
        <div className="ls-feat"><span className="ls-feat-ico">📈</span> Real-time Monitoring</div>
        <div className="ls-feat"><span className="ls-feat-ico">📊</span> Smart Analytics</div>
        <div className="ls-feat"><span className="ls-feat-ico">🔔</span> Instant Alerts</div>
        <div className="ls-feat"><span className="ls-feat-ico">🛡️</span> Secure & Reliable</div>
      </div>
    </div>
  );
}
