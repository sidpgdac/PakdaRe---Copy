import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

// ── SVG Icon Library ─────────────────────────────────────────────────
const NavIcon = {
  Map: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
      <line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/>
    </svg>
  ),
  Report: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  ),
  Track: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      <line x1="11" y1="8" x2="11" y2="11"/><line x1="11" y1="14" x2="11.01" y2="14"/>
    </svg>
  ),
  Trophy: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="8 21 12 17 16 21"/><line x1="12" y1="17" x2="12" y2="13"/>
      <path d="M17 4H7v4c0 2.8 2.2 5 5 5s5-2.2 5-5V4z"/>
      <path d="M17 4h3v3a3 3 0 0 1-3 3"/><path d="M7 4H4v3a3 3 0 0 0 3 3"/>
    </svg>
  ),
  Gallery: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
    </svg>
  ),
  Lock: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  ),
  Cases: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
      <rect x="9" y="3" width="6" height="4" rx="1" ry="1"/>
      <line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/>
    </svg>
  ),
  Target: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
    </svg>
  ),
  Chart: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
    </svg>
  ),
  Stats: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  Officers: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  Settings: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  More: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>
    </svg>
  ),
  Close: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
};

// ── Tab Definitions ──────────────────────────────────────────────────
const CITIZEN_TABS = [
  { id: 'map',         path: '/map',         Icon: NavIcon.Map,      label: 'Map',         short: 'Map',     mobilePriority: 1 },
  { id: 'report',      path: '/report',      Icon: NavIcon.Report,   label: 'Report',      short: 'Report',  mobilePriority: 2 },
  { id: 'track',       path: '/track',       Icon: NavIcon.Track,    label: 'Track',       short: 'Track',   mobilePriority: 3 },
  { id: 'leaderboard', path: '/leaderboard', Icon: NavIcon.Trophy,   label: 'Rankings',    short: 'Ranks',   mobilePriority: 4 },
  { id: 'gallery',     path: '/gallery',     Icon: NavIcon.Gallery,  label: 'Gallery',     short: 'Gallery', mobilePriority: 5 },
  { id: 'login',       path: '/login',       Icon: NavIcon.Lock,     label: 'Staff Login', short: 'Login',   mobilePriority: 6 },
];

const OFFICER_TABS = [
  { id: 'map',         path: '/map',         Icon: NavIcon.Map,      label: 'Live Map',    short: 'Map',     mobilePriority: 1 },
  { id: 'my-cases',    path: '/my-cases',    Icon: NavIcon.Cases,    label: 'My Cases',    short: 'Cases',   mobilePriority: 2, badge: true },
  { id: 'report',      path: '/report',      Icon: NavIcon.Report,   label: 'File Report', short: 'Report',  mobilePriority: 3 },
  { id: 'leaderboard', path: '/leaderboard', Icon: NavIcon.Trophy,   label: 'Rankings',    short: 'Ranks',   mobilePriority: 4 },
];

const STAFF_TABS = [
  { id: 'map',         path: '/map',         Icon: NavIcon.Map,      label: 'Live Map',      short: 'Map',     mobilePriority: 1 },
  { id: 'complaints',  path: '/complaints',  Icon: NavIcon.Cases,    label: 'All Cases',     short: 'Cases',   mobilePriority: 2, badge: true },
  { id: 'my-cases',    path: '/my-cases',    Icon: NavIcon.Target,   label: 'My Cases',      short: 'Mine',    mobilePriority: 3 },
  { id: 'report',      path: '/report',      Icon: NavIcon.Report,   label: 'File Report',   short: 'Report',  mobilePriority: 4 },
  { id: 'dashboard',   path: '/dashboard',   Icon: NavIcon.Chart,    label: 'Command Center', short: 'Cmd',    mobilePriority: 5 },
  { id: 'leaderboard', path: '/leaderboard', Icon: NavIcon.Trophy,   label: 'Rankings',      short: 'Ranks',   mobilePriority: 6 },
  { id: 'summary',     path: '/summary',     Icon: NavIcon.Stats,    label: 'Ward Stats',    short: 'Stats',   mobilePriority: 7 },
  { id: 'officers',    path: '/officers',    Icon: NavIcon.Officers, label: 'Officers',      short: 'Team',    mobilePriority: 8 },
  { id: 'admin',       path: '/admin',       Icon: NavIcon.Settings, label: 'Admin',         short: 'Admin',   mobilePriority: 9 },
];

const MOBILE_PRIMARY = 4;

// Role pill data
const ROLE_PILL = {
  public:  { label: 'Public',  color: 'rgba(99,102,241,0.15)',  border: 'rgba(99,102,241,0.35)',  text: '#818cf8' },
  officer: { label: 'Officer', color: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.3)',   text: '#34d399' },
  staff:   { label: 'Staff',   color: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.3)',    text: '#f87171' },
};

export default function NavTabs({ active, navigate, complaintCount, breachCount }) {
  const { t } = useTranslation();
  const { user, role } = useAuth();
  const [showMore, setShowMore] = useState(false);

  const tabs = !user ? CITIZEN_TABS : role === 'officer' ? OFFICER_TABS : STAFF_TABS;
  const roleKey = !user ? 'public' : role === 'officer' ? 'officer' : 'staff';
  const pill = ROLE_PILL[roleKey];

  const activeId = active?.replace('/', '') || 'map';
  const sorted   = [...tabs].sort((a, b) => a.mobilePriority - b.mobilePriority);
  const primary  = sorted.slice(0, MOBILE_PRIMARY);
  const more     = sorted.slice(MOBILE_PRIMARY);
  const hasMore  = more.length > 0;
  const activeInMore = more.some(t => t.id === activeId || activeId.startsWith(t.id));

  const go = (path) => { navigate(path); setShowMore(false); };

  const isActive = (tab) => {
    if (tab.id === 'track')    return activeId.startsWith('track');
    if (tab.id === 'my-cases') return activeId === 'my-cases';
    return activeId === tab.id;
  };

  return (
    <>
      {/* ── DESKTOP NAV ───────────────────────────────────────────────── */}
      <nav className="nav-wrap nav-desktop" role="navigation" aria-label="Main navigation">
        {/* Role badge */}
        <div
          className="nav-role-pill"
          style={{ background: pill.color, border: `1px solid ${pill.border}`, color: pill.text }}
        >
          <span className="nav-role-dot" style={{ background: pill.text }} />
          {pill.label}
        </div>

        <div className="nav-tabs">
          {tabs.map(tab => {
            const active = isActive(tab);
            return (
              <button
                key={tab.id}
                className={`ntab${active ? ' active' : ''}`}
                onClick={() => go(tab.path)}
                aria-current={active ? 'page' : undefined}
              >
                <span className="ntab-i" aria-hidden="true">
                  <tab.Icon size={18} />
                </span>
                <span className="ntab-l">{t('nav_' + tab.id.replace('-', '_'))}</span>

                {tab.badge && complaintCount > 0 && (
                  <span className="ntab-badge">{complaintCount > 99 ? '99+' : complaintCount}</span>
                )}
                {tab.id === 'complaints' && breachCount > 0 && (
                  <motion.span
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1.4 }}
                    style={{
                      position: 'absolute', top: 2, right: 2,
                      width: 8, height: 8, borderRadius: '50%',
                      background: 'var(--red)', boxShadow: '0 0 6px var(--red)',
                    }}
                  />
                )}
                {active && (
                  <motion.div
                    layoutId="active-tab-desktop"
                    style={{
                      position: 'absolute', bottom: -1, left: 12, right: 12,
                      height: 2, background: 'var(--blue2)',
                      borderRadius: '2px 2px 0 0', zIndex: 1,
                    }}
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── MOBILE BOTTOM NAV ──────────────────────────────────────────── */}
      <nav className="nav-mobile" role="navigation" aria-label="Main navigation">
        <AnimatePresence>
          {showMore && hasMore && (
            <>
              <motion.div
                className="mob-more-overlay"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                onClick={() => setShowMore(false)}
              />
              <motion.div
                className="mob-more-drawer"
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              >
                <div className="mob-more-grid">
                  {more.map((tab, i) => (
                    <motion.button
                      key={tab.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={`mob-more-item${isActive(tab) ? ' active' : ''}`}
                      onClick={() => go(tab.path)}
                    >
                      <span className="mob-more-ico" aria-hidden="true">
                        <tab.Icon size={20} />
                      </span>
                      <span className="mob-more-lbl">{t('nav_' + tab.id.replace('-', '_'))}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <div className="mob-nav-bar">
          {primary.map(tab => {
            const active = isActive(tab);
            return (
              <button
                key={tab.id}
                className={`mob-tab${active ? ' active' : ''}`}
                onClick={() => go(tab.path)}
                aria-current={active ? 'page' : undefined}
              >
                {active && (
                  <motion.div
                    layoutId="active-mob-tab"
                    className="mob-tab-active-bg"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  />
                )}
                <span className="mob-tab-ico" aria-hidden="true">
                  <tab.Icon size={active ? 22 : 20} />
                </span>
                <span className="mob-tab-lbl">{tab.short}</span>
                {tab.badge && complaintCount > 0 && (
                  <span className="mob-tab-badge">{complaintCount > 99 ? '99+' : complaintCount}</span>
                )}
              </button>
            );
          })}

          {hasMore && (
            <button
              className={`mob-tab${showMore || activeInMore ? ' active' : ''}`}
              onClick={() => setShowMore(v => !v)}
              aria-label="More options"
              aria-expanded={showMore}
            >
              {(showMore || activeInMore) && (
                <motion.div
                  layoutId="active-mob-tab"
                  className="mob-tab-active-bg"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                />
              )}
              <span className="mob-tab-ico" aria-hidden="true">
                <AnimatePresence mode="wait">
                  {showMore ? (
                    <motion.span
                      key="close"
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 90, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      style={{ display: 'flex' }}
                    >
                      <NavIcon.Close size={20} />
                    </motion.span>
                  ) : (
                    <motion.span
                      key="more"
                      initial={{ rotate: 90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: -90, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      style={{ display: 'flex' }}
                    >
                      <NavIcon.More size={20} />
                    </motion.span>
                  )}
                </AnimatePresence>
              </span>
              <span className="mob-tab-lbl">{showMore ? 'Close' : 'More'}</span>
              {activeInMore && !showMore && <span className="mob-more-active-dot" />}
            </button>
          )}
        </div>
      </nav>
    </>
  );
}
