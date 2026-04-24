import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

// mobilePriority: 1–4 appear in the bottom bar; 5+ go into the "More" drawer
const TABS = [
  { id: 'dashboard',    icon: '📊', labelKey: 'nav_dashboard', short: 'Home',    mobilePriority: 4 },
  { id: 'map',          icon: '🗺️',  labelKey: 'nav_map',       short: 'Map',     mobilePriority: 1 },
  { id: 'public-grid',  icon: '🖼️',  labelKey: 'Gallery',       short: 'Gallery', mobilePriority: 7 },
  { id: 'complaints',   icon: '📋', labelKey: 'nav_complaints', short: 'Cases',   mobilePriority: 2, badge: true },
  { id: 'summary',      icon: '📈', labelKey: 'nav_summary',   short: 'Stats',   mobilePriority: 5 },
  { id: 'officers',     icon: '👮', labelKey: 'nav_officers',  short: 'Team',    mobilePriority: 6 },
  { id: 'report',       icon: '➕', labelKey: 'nav_report',    short: 'Report',  mobilePriority: 3 },
  { id: 'admin',        icon: '🔐', labelKey: 'nav_admin',     short: 'Admin',   mobilePriority: 5 },
];

const MOBILE_PRIMARY_COUNT = 4;

export default function NavTabs({ active, setActive, complaintCount, breachCount }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [showMore, setShowMore] = useState(false);

  // Filter by auth
  const filteredTabs = user
    ? TABS
    : TABS.filter(tab => ['map', 'public-grid', 'report'].includes(tab.id));

  // Sort by mobile priority for bottom bar layout
  const sortedByPriority = [...filteredTabs].sort((a, b) => a.mobilePriority - b.mobilePriority);
  const primaryTabs = sortedByPriority.slice(0, MOBILE_PRIMARY_COUNT);
  const moreTabs    = sortedByPriority.slice(MOBILE_PRIMARY_COUNT);
  const hasMore     = moreTabs.length > 0;

  // Active page lives in More drawer?
  const activeInMore = moreTabs.some(t => t.id === active);

  const handleTabClick = (id) => {
    setActive(id);
    setShowMore(false);
  };

  return (
    <>
      {/* ═══════════════════════════════════════════════════
          DESKTOP — horizontal top nav (unchanged)
          Shown via .nav-desktop { display:block } on ≥769px
          Hidden via .nav-desktop { display:none } on ≤768px
      ════════════════════════════════════════════════════ */}
      <nav className="nav-wrap nav-desktop" role="navigation" aria-label="Main navigation">
        <div className="nav-tabs">
          {filteredTabs.map(tab => (
            <button
              key={tab.id}
              id={`nav-${tab.id}`}
              className={`ntab${active === tab.id ? ' active' : ''}`}
              onClick={() => setActive(tab.id)}
              aria-current={active === tab.id ? 'page' : undefined}
              style={{ position: 'relative' }}
            >
              <span className="ntab-i" aria-hidden="true">{tab.icon}</span>
              <span className="ntab-l">{t(tab.labelKey)}</span>

              {/* Complaint count badge */}
              {tab.badge && complaintCount > 0 && (
                <span className="ntab-badge">
                  {complaintCount > 99 ? '99+' : complaintCount}
                </span>
              )}

              {/* SLA breach dot */}
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

              {/* Active indicator pill */}
              {active === tab.id && (
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

      {/* ═══════════════════════════════════════════════════
          MOBILE — fixed bottom nav
          Hidden on ≥769px via .nav-mobile { display:none }
          Shown on ≤768px via media query
      ════════════════════════════════════════════════════ */}
      <nav className="nav-mobile" role="navigation" aria-label="Main navigation">

        {/* More drawer backdrop + panel */}
        <AnimatePresence>
          {showMore && hasMore && (
            <>
              <motion.div
                className="mob-more-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
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
                  {moreTabs.map(tab => (
                    <button
                      key={tab.id}
                      className={`mob-more-item${active === tab.id ? ' active' : ''}`}
                      onClick={() => handleTabClick(tab.id)}
                    >
                      <span className="mob-more-ico" aria-hidden="true">{tab.icon}</span>
                      <span className="mob-more-lbl">{t(tab.labelKey)}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Bottom bar */}
        <div className="mob-nav-bar">
          {primaryTabs.map(tab => (
            <button
              key={tab.id}
              id={`mob-nav-${tab.id}`}
              className={`mob-tab${active === tab.id ? ' active' : ''}`}
              onClick={() => handleTabClick(tab.id)}
              aria-current={active === tab.id ? 'page' : undefined}
            >
              {/* Active background pill */}
              {active === tab.id && (
                <motion.div
                  layoutId="active-mob-tab"
                  className="mob-tab-active-bg"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                />
              )}

              <span className="mob-tab-ico" aria-hidden="true">{tab.icon}</span>
              <span className="mob-tab-lbl">{tab.short}</span>

              {/* Count badge */}
              {tab.badge && complaintCount > 0 && (
                <span className="mob-tab-badge">
                  {complaintCount > 99 ? '99+' : complaintCount}
                </span>
              )}

              {/* SLA breach dot */}
              {tab.id === 'complaints' && breachCount > 0 && (
                <motion.span
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ repeat: Infinity, duration: 1.4 }}
                  className="mob-breach-dot"
                />
              )}
            </button>
          ))}

          {/* "More" button — only shown when there are overflow tabs */}
          {hasMore && (
            <button
              className={`mob-tab${showMore || activeInMore ? ' active' : ''}`}
              onClick={() => setShowMore(v => !v)}
              aria-label="More navigation options"
              aria-expanded={showMore}
            >
              {(showMore || activeInMore) && (
                <motion.div
                  layoutId="active-mob-tab"
                  className="mob-tab-active-bg"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                />
              )}
              <span className="mob-tab-ico" aria-hidden="true" style={{ fontSize: 18, letterSpacing: 1 }}>
                {showMore ? '✕' : '•••'}
              </span>
              <span className="mob-tab-lbl">{showMore ? 'Close' : 'More'}</span>
              {/* Blue dot if active page is inside the drawer */}
              {activeInMore && !showMore && <span className="mob-more-active-dot" />}
            </button>
          )}
        </div>
      </nav>
    </>
  );
}
