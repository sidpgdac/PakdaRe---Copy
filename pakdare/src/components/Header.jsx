import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { useAuth } from '../context/AuthContext';

const LANGS = [
  { code: 'en', label: 'EN' },
  { code: 'hi', label: 'हि' },
  { code: 'mr', label: 'म' },
];

export default function Header({ complaints, dbStatus, mode, setMode, theme, setTheme, onLogoClick }) {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const [logoErr, setLogoErr] = useState(false);
  const active   = complaints.filter(c => !c.resolved).length;
  const pending  = complaints.filter(c => !c.resolved && c.status === 'Open').length;
  const resolved = complaints.filter(c => c.resolved).length;
  const critical = complaints.filter(c => c.severity === 'critical' && !c.resolved).length;

  return (
    <header className="hdr">
      <div className="hdr-inner">
        {/* Logo */}
        <div className="logo" onClick={onLogoClick} style={{ cursor: 'pointer' }} title="Staff Portal">
          <div className="logo-badge">
            {logoErr ? (
              <span style={{ fontFamily: 'var(--ff-display)', fontSize: 20, fontWeight: 900, color: 'var(--gold)' }}>बृ</span>
            ) : (
              <img
                src="https://portal.mcgm.gov.in/com.mcgm.newframework/images/logo_V1.png"
                alt="MCGM"
                style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }}
                onError={() => setLogoErr(true)}
              />
            )}
          </div>
          <div>
            <div className="logo-name">{t('app_title')}</div>
            <div className="logo-sub">{t('app_sub')}</div>
          </div>
        </div>

        {/* Live KPI Stats */}
        <div className="hdr-stats">
          {critical > 0 && (
            <div className="hs hd hs-pulse">
              <div className="v">{critical}</div>
              <div className="l">{t('critical')}</div>
            </div>
          )}
          <div className="hs hd"><div className="v">{active}</div><div className="l">Active</div></div>
          <div className="hs hw"><div className="v">{pending}</div><div className="l">Pending</div></div>
          <div className="hs hs2"><div className="v">{resolved}</div><div className="l">{t('resolved')}</div></div>
          <div className="hs hi"><div className="v">27</div><div className="l">Wards</div></div>
        </div>

        {/* Controls */}
        <div className="hdr-tools">
          {/* Language Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--glass-bg2)', border: '1px solid var(--border2)', borderRadius: 'var(--r-full)', padding: 2 }}>
            {LANGS.map(l => (
              <button
                key={l.code}
                onClick={() => i18n.changeLanguage(l.code)}
                style={{
                  padding: '4px 9px', borderRadius: 'var(--r-full)', fontSize: 11, fontWeight: 700,
                  border: 'none', cursor: 'pointer', transition: 'all .25s',
                  background: i18n.language === l.code ? 'var(--blue)' : 'transparent',
                  color: i18n.language === l.code ? '#fff' : 'var(--text-muted)',
                }}
              >
                {l.label}
              </button>
            ))}
          </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Sun/Moon Theme Toggle */}
              <button
                className="theme-toggle"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                title={theme === 'dark' ? t('theme_light') : t('theme_dark')}
              >
                <div className="theme-toggle-thumb">
                  {theme === 'dark' ? '🌙' : '☀️'}
                </div>
              </button>

              {/* DB Status Chips */}
              {dbStatus === 'syncing' ? (
                <div className="live-chip" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--blue)' }}>
                  <div className="live-d" style={{ background: 'var(--blue)', animation: 'pulse 1s infinite' }} />
                  <span>Syncing...</span>
                </div>
              ) : dbStatus === 'conn' ? (
                <div className="live-chip">
                  <div className="live-d" />
                  <span>{t('live')}</span>
                </div>
              ) : null}
            </div>
          
          {user && (
            <button
              className="mode-toggle-btn"
              onClick={signOut}
              style={{ background: 'rgba(255, 59, 48, 0.1)', color: 'var(--red)', borderColor: 'var(--red)', marginLeft: 8 }}
            >
              🚪 Logout
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
