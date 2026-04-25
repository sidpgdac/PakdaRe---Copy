import { useState } from 'react';
import i18n from '../i18n';
import { useAuth } from '../context/AuthContext';
import { WARDS } from '../data/wardData';

const THEMES      = ['dark', 'light', 'system'];
const THEME_ICON  = { dark: '🌙', light: '☀️', system: '💻' };
const THEME_TITLE = { dark: 'Dark mode', light: 'Light mode', system: 'System default' };

const LANGS       = ['en', 'mr', 'hi'];
const LANG_LABEL  = { en: 'EN', mr: 'मराठी', hi: 'हिंदी' };
const LANG_FLAG   = { en: '🌐', mr: '🟠', hi: '🇮🇳' };

export default function Header({ complaints, dbStatus, theme, setTheme, onLogoClick }) {
  const { user, signOut } = useAuth();
  const [logoErr, setLogoErr] = useState(false);

  const active   = complaints.filter(c => !c.resolved).length;
  const pending  = complaints.filter(c => !c.resolved && c.status === 'Open').length;
  const resolved = complaints.filter(c => c.resolved).length;
  const critical = complaints.filter(c => c.severity === 'critical' && !c.resolved).length;

  const cycleTheme = () => {
    const next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
    setTheme(next);
  };

  const cycleLang = () => {
    const cur  = LANGS.includes(i18n.language) ? i18n.language : 'en';
    const next = LANGS[(LANGS.indexOf(cur) + 1) % LANGS.length];
    i18n.changeLanguage(next);
  };

  const curLang = LANGS.includes(i18n.language) ? i18n.language : 'en';

  return (
    <header className="hdr">
      <div className="hdr-inner">

        {/* ── Brand ─────────────────────────────────── */}
        <div className="logo" onClick={onLogoClick} style={{ cursor: 'pointer' }} title="Staff Portal">
          <div className="logo-badge">
            {logoErr ? (
              <span style={{ fontFamily: 'var(--ff-display)', fontSize: 20, fontWeight: 900, color: 'var(--gold)' }}>बृ</span>
            ) : (
              <img
                src="https://portal.mcgm.gov.in/com.mcgm.newframework/images/logo_V1.png"
                alt="BMC"
                style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }}
                onError={() => setLogoErr(true)}
              />
            )}
          </div>
          <div>
            <div className="logo-name">MyBMC</div>
            <div className="logo-sub">Health Tracker On Map</div>
          </div>
        </div>

        {/* ── Live KPI strip ────────────────────────── */}
        <div className="hdr-stats">
          {critical > 0 && (
            <div className="hs hd hs-pulse">
              <div className="v">{critical}</div>
              <div className="l">Critical</div>
            </div>
          )}
          <div className="hs hd"><div className="v">{active}</div><div className="l">Active</div></div>
          <div className="hs hw"><div className="v">{pending}</div><div className="l">Pending</div></div>
          <div className="hs hs2"><div className="v">{resolved}</div><div className="l">Resolved</div></div>
          <div className="hs hi"><div className="v">{WARDS.length}</div><div className="l">Wards</div></div>
        </div>

        {/* ── Controls ──────────────────────────────── */}
        <div className="hdr-tools">

          {/* Language cycle — one tap, EN → मराठी → हिंदी */}
          <button
            className="lang-cycle-btn"
            onClick={cycleLang}
            title={`Language: ${LANG_LABEL[curLang]} — tap to switch`}
          >
            <span>{LANG_FLAG[curLang]}</span>
            <span>{LANG_LABEL[curLang]}</span>
          </button>

          {/* Theme cycle — one tap, Dark → Light → System */}
          <button
            className="theme-toggle"
            onClick={cycleTheme}
            title={THEME_TITLE[theme]}
          >
            {THEME_ICON[theme]}
          </button>

          {/* DB status */}
          {dbStatus === 'syncing' ? (
            <div className="live-chip" style={{ background: 'rgba(0,81,187,0.10)', color: 'var(--blue)' }}>
              <div className="live-d" style={{ background: 'var(--blue)', animation: 'pulse 1s infinite' }} />
              <span>Syncing…</span>
            </div>
          ) : dbStatus === 'conn' ? (
            <div className="live-chip">
              <div className="live-d" />
              <span>LIVE</span>
            </div>
          ) : null}

          {user && (
            <button
              className="mode-toggle-btn"
              onClick={signOut}
              style={{ background: 'rgba(255,255,255,0.14)', color: '#fff', borderColor: 'rgba(255,100,100,0.6)', fontSize: 11, padding: '4px 10px' }}
            >
              🚪 Logout
            </button>
          )}
        </div>

      </div>
    </header>
  );
}
