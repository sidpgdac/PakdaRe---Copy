import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

// ── CITIZEN tabs (unauthenticated) ──────────────────────────────────
const CITIZEN_TABS = [
  { id: 'map',         path: '/map',         icon: '🗺️',  label: 'Map',         short: 'Map',         mobilePriority: 1 },
  { id: 'report',      path: '/report',      icon: '➕',   label: 'Report',      short: 'Report',      mobilePriority: 2 },
  { id: 'track',       path: '/track',       icon: '🔍',   label: 'Track',       short: 'Track',       mobilePriority: 3 },
  { id: 'leaderboard', path: '/leaderboard', icon: '🏆',   label: 'Rankings',    short: 'Ranks',       mobilePriority: 4 },
  { id: 'gallery',     path: '/gallery',     icon: '🖼️',  label: 'Gallery',     short: 'Gallery',     mobilePriority: 5 },
  { id: 'login',       path: '/login',       icon: '🔐',   label: 'Staff Login', short: 'Login',       mobilePriority: 6 },
];

// ── OFFICER tabs (field officer role — limited access) ───────────────
const OFFICER_TABS = [
  { id: 'map',         path: '/map',         icon: '🗺️',  label: 'Live Map',     short: 'Map',     mobilePriority: 1 },
  { id: 'my-cases',    path: '/my-cases',    icon: '📋',  label: 'My Cases',     short: 'Cases',   mobilePriority: 2, badge: true },
  { id: 'report',      path: '/report',      icon: '➕',  label: 'File Report',  short: 'Report',  mobilePriority: 3 },
  { id: 'leaderboard', path: '/leaderboard', icon: '🏆',  label: 'Rankings',     short: 'Ranks',   mobilePriority: 4 },
];

// ── STAFF / ADMIN tabs (full access) ────────────────────────────────
const STAFF_TABS = [
  { id: 'map',         path: '/map',         icon: '🗺️',  label: 'Live Map',      short: 'Map',     mobilePriority: 1 },
  { id: 'complaints',  path: '/complaints',  icon: '📋',  label: 'All Cases',     short: 'Cases',   mobilePriority: 2, badge: true },
  { id: 'my-cases',    path: '/my-cases',    icon: '🎯',  label: 'My Cases',      short: 'Mine',    mobilePriority: 3 },
  { id: 'report',      path: '/report',      icon: '➕',  label: 'File Report',   short: 'Report',  mobilePriority: 4 },
  { id: 'dashboard',   path: '/dashboard',   icon: '📊',  label: 'Command Center', short: 'Command', mobilePriority: 5 },
  { id: 'leaderboard', path: '/leaderboard', icon: '🏆',  label: 'Rankings',      short: 'Ranks',   mobilePriority: 6 },
  { id: 'summary',     path: '/summary',     icon: '📈',  label: 'Ward Stats',    short: 'Stats',   mobilePriority: 7 },
  { id: 'officers',    path: '/officers',    icon: '👮',  label: 'Officers',      short: 'Team',    mobilePriority: 8 },
  { id: 'admin',       path: '/admin',       icon: '⚙️',  label: 'Admin',         short: 'Admin',   mobilePriority: 9 },
];

const MOBILE_PRIMARY = 4;

export default function NavTabs({ active, navigate, complaintCount, breachCount }) {
  const { t } = useTranslation();
  const { user, role } = useAuth();
  const [showMore, setShowMore] = useState(false);

  const tabs = !user
    ? CITIZEN_TABS
    : role === 'officer'
      ? OFFICER_TABS
      : STAFF_TABS;

  const audienceLabel = !user 
    ? `👤 ${t('role_public')}` 
    : role === 'officer' 
      ? `👷 ${t('role_officer')}` 
      : `🔒 ${t('role_staff')}`;

  const activeId = active?.replace('/', '') || 'map';

  const sorted  = [...tabs].sort((a, b) => a.mobilePriority - b.mobilePriority);
  const primary = sorted.slice(0, MOBILE_PRIMARY);
  const more    = sorted.slice(MOBILE_PRIMARY);
  const hasMore = more.length > 0;
  const activeInMore = more.some(t => t.id === activeId || activeId.startsWith(t.id));

  const go = (path) => { navigate(path); setShowMore(false); };

  const isActive = (tab) => {
    if (tab.id === 'track')    return activeId.startsWith('track');
    if (tab.id === 'my-cases') return activeId === 'my-cases';
    return activeId === tab.id;
  };

  return (
    <>
      {/* ── DESKTOP top nav ─────────────────────────────────────────── */}
      <nav className="nav-wrap nav-desktop" role="navigation" aria-label="Main navigation">
        <div className="nav-audience-label">{audienceLabel}</div>
        <div className="nav-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`ntab${isActive(tab) ? ' active' : ''}`}
              onClick={() => go(tab.path)}
              aria-current={isActive(tab) ? 'page' : undefined}
            >
              <span className="ntab-i" aria-hidden="true">{tab.icon}</span>
              <span className="ntab-l">{t('nav_' + tab.id.replace('-','_'))}</span>

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
              {isActive(tab) && (
                <motion.div
                  layoutId="active-tab-desktop"
                  style={{
                    position: 'absolute', bottom: -1, left: 16, right: 16,
                    height: 2, background: 'var(--blue2)',
                    borderRadius: '2px 2px 0 0', zIndex: 1,
                  }}
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* ── MOBILE bottom nav ────────────────────────────────────────── */}
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
                initial={{ opacity: 0, y: 16, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              >
                <div className="mob-more-grid">
                  {more.map(tab => (
                    <button
                      key={tab.id}
                      className={`mob-more-item${isActive(tab) ? ' active' : ''}`}
                      onClick={() => go(tab.path)}
                    >
                      <span className="mob-more-ico" aria-hidden="true">{tab.icon}</span>
                      <span className="mob-more-lbl">{t('nav_' + tab.id.replace('-','_'))}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <div className="mob-nav-bar">
          {primary.map(tab => (
            <button
              key={tab.id}
              className={`mob-tab${isActive(tab) ? ' active' : ''}`}
              onClick={() => go(tab.path)}
              aria-current={isActive(tab) ? 'page' : undefined}
            >
              {isActive(tab) && (
                <motion.div layoutId="active-mob-tab" className="mob-tab-active-bg"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }} />
              )}
              <span className="mob-tab-ico" aria-hidden="true">{tab.icon}</span>
              <span className="mob-tab-lbl">{t('nav_' + tab.id.replace('-','_'))}</span>
              {tab.badge && complaintCount > 0 && (
                <span className="mob-tab-badge">{complaintCount > 99 ? '99+' : complaintCount}</span>
              )}
              {tab.id === 'complaints' && breachCount > 0 && (
                <motion.span
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ repeat: Infinity, duration: 1.4 }}
                  className="mob-breach-dot"
                />
              )}
            </button>
          ))}

          {hasMore && (
            <button
              className={`mob-tab${showMore || activeInMore ? ' active' : ''}`}
              onClick={() => setShowMore(v => !v)}
              aria-label="More options"
              aria-expanded={showMore}
            >
              {(showMore || activeInMore) && (
                <motion.div layoutId="active-mob-tab" className="mob-tab-active-bg"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }} />
              )}
              <span className="mob-tab-ico" aria-hidden="true" style={{ fontSize: 18, letterSpacing: 1 }}>
                {showMore ? '✕' : '•••'}
              </span>
              <span className="mob-tab-lbl">{showMore ? t('nav_close') : t('nav_more')}</span>
              {activeInMore && !showMore && <span className="mob-more-active-dot" />}
            </button>
          )}
        </div>
      </nav>
    </>
  );
}
