import { useState, useEffect, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import LoadingScreen from './components/LoadingScreen';
import TickerBar from './components/TickerBar';
import Header from './components/Header';
import NavTabs from './components/NavTabs';
import Dashboard from './components/pages/Dashboard';
import MapPage from './components/pages/MapPage';
import Complaints from './components/pages/Complaints';
import PublicComplaints from './components/pages/PublicComplaints';
import Summary from './components/pages/Summary';
import FileReport from './components/pages/FileReport';
import HierarchyPage from './components/pages/HierarchyPage';
import AdminDashboard from './components/pages/AdminDashboard';
import WardModal from './components/modals/WardModal';
import ComplaintModal from './components/modals/ComplaintModal';
import FileReportModal from './components/modals/FileReportModal';
import ChatBot from './components/ChatBot';
import { ToastContainer, useToast } from './components/ui/Toast';
import { useComplaints } from './hooks/useComplaints';
import { useSLAEngine } from './hooks/useSLAEngine';

const PAGE_VARIANTS = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.18 } },
};

import { AuthProvider, useAuth } from './context/AuthContext';
import StaffLogin from './components/pages/StaffLogin';

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const [loading,       setLoading]       = useState(true);
  const [mode,          setMode]          = useState('real');
  const [activePage,    setActivePage]    = useState('map');
  const [wardModal,     setWardModal]     = useState(null);
  const [complaintModal,setComplaintModal]= useState(null);
  const [reportModal,   setReportModal]   = useState(false);
  const [theme,         setTheme]         = useState(() => localStorage.getItem('pakdare-theme') || 'dark');
  const [isNavigating,  setIsNavigating]  = useState(false);
  const [announcement,  setAnnouncement]  = useState(() => localStorage.getItem('pakdare-ann') || '');

  const { toasts, showToast } = useToast();
  const { complaints, loading: dataLoading, fetchError, addComplaint, resolveComplaint, resolveWithPhoto, updateComplaint, seedDemo, clearDemo, fetchComplaintDetail, refetch } = useComplaints(mode);
  
  const { user, role, loading: authLoading } = useAuth();

  // Persist & apply theme — supports 'light' | 'dark' | 'system'
  useEffect(() => {
    localStorage.setItem('pakdare-theme', theme);
    const apply = (t) => document.documentElement.setAttribute('data-theme', t);
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      apply(mq.matches ? 'dark' : 'light');
      const handler = (e) => apply(e.matches ? 'dark' : 'light');
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
    apply(theme);
  }, [theme]);

  // Persist announcement
  useEffect(() => {
    localStorage.setItem('pakdare-ann', announcement);
  }, [announcement]);

  // Route protection
  useEffect(() => {
    if (!authLoading && !user) {
      const protectedPages = ['dashboard', 'complaints', 'summary', 'officers', 'admin'];
      if (protectedPages.includes(activePage)) {
        setActivePage('map');
      }
    } else if (!authLoading && user && activePage === 'staff-login') {
      setActivePage('dashboard');
    }
  }, [user, authLoading, activePage]);

  // Stable callback so useSLAEngine's effect doesn't reset on every render
  const onBreach = useCallback((c) => {
    if (user) {
      showToast(`🚨 SLA Breached: ${c.id} — ${c.ward} Ward (${c.severity})`, 'error');
    }
  }, [user, showToast]);

  // SLA Engine
  const { getSLAInfo, getBreachedComplaints } = useSLAEngine({
    complaints,
    onBreach,
    updateComplaint,
  });

  const breachCount = useMemo(() => getBreachedComplaints().length, [getBreachedComplaints]);
  const unresolvedCount = useMemo(() => complaints.filter(c => !c.resolved).length, [complaints]);

  const alertBranch = useCallback(() => showToast('🚨 Alert sent to Insecticide Branch!', 'warn'), [showToast]);

  // Lazy-load full complaint detail (with photos) when opening modal
  const handleComplaintDetail = useCallback(async (c) => {
    setComplaintModal(c); // show immediately with list data
    const full = await fetchComplaintDetail(c.id);
    if (full) setComplaintModal(full); // update with photos once loaded
  }, [fetchComplaintDetail]);

  // Tab navigation with loader
  const handleNav = (page) => {
    if (page === activePage) return;
    setIsNavigating(true);
    setTimeout(() => {
      setActivePage(page);
      setIsNavigating(false);
    }, 350);
  };

  // Gate ONLY on the animation flag. authLoading resolves within its own 5-second
  // bail timeout. dataLoading shows a sync bar in the Header — never remounts
  // the LoadingScreen (which caused the infinite-loop bug).
  if (loading) {
    return <LoadingScreen onEnter={() => setLoading(false)} />;
  }

  return (
    <>
      <TickerBar />
      {/* Thin progress bar: page navigation OR live data syncing */}
      {(isNavigating || dataLoading) && <div className="tab-loader-bar" />}
      {/* Database error banner — shows actual Supabase error so it's actionable */}
      {fetchError && !dataLoading && (
        <div style={{
          background: 'rgba(239,68,68,0.12)', borderBottom: '1px solid rgba(239,68,68,0.3)',
          padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 10,
          fontSize: 12, color: 'var(--red2)', flexWrap: 'wrap',
        }}>
          <span style={{ fontWeight: 700 }}>⚠️ Database error:</span>
          <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--ff-mono)', fontSize: 11, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {fetchError}
          </span>
          <button
            onClick={refetch}
            style={{
              padding: '4px 12px', borderRadius: 'var(--r-full)', fontSize: 11, fontWeight: 700,
              background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)',
              color: 'var(--red2)', cursor: 'pointer', flexShrink: 0,
            }}
          >
            Retry
          </button>
          <span style={{ color: 'var(--text-muted)', fontSize: 11, flexShrink: 0 }}>
            Showing demo data
          </span>
        </div>
      )}
      <Header
        complaints={complaints}
        dbStatus={dataLoading ? 'syncing' : 'conn'}
        theme={theme}
        setTheme={setTheme}
        onLogoClick={() => setActivePage('staff-login')}
      />
      <NavTabs
        active={activePage}
        setActive={handleNav}
        complaintCount={unresolvedCount}
        breachCount={breachCount}
      />

      <div className={`container${activePage === 'map' ? ' container-map' : ''}`}>
        <AnimatePresence mode="wait">
          {!isNavigating && (
            <motion.div
              key={activePage}
              variants={PAGE_VARIANTS}
              initial="initial"
              animate="animate"
              exit="exit"
            >
                {activePage === 'dashboard' && (
                  <Dashboard
                    complaints={complaints}
                    setActivePage={handleNav}
                    onWardClick={setWardModal}
                    seedDemo={seedDemo}
                    clearDemo={clearDemo}
                  />
                )}
                {activePage === 'map' && (
                  <>
                    {announcement && (
                      <div className="ann-banner">
                        <span className="ann-icon">📢</span>
                        <span className="ann-text">{announcement}</span>
                      </div>
                    )}
                    <MapPage complaints={complaints} onWardClick={setWardModal} fetchComplaintDetail={fetchComplaintDetail} />
                  </>
                )}
                {activePage === 'public-grid' && (
                  <PublicComplaints complaints={complaints} fetchComplaintDetail={fetchComplaintDetail} />
                )}
                {activePage === 'staff-login' && (
                  <StaffLogin setActivePage={setActivePage} showToast={showToast} />
                )}
              {activePage === 'complaints' && (
                <Complaints
                  complaints={complaints}
                  onDetail={handleComplaintDetail}
                  onAlertBranch={alertBranch}
                  getSLAInfo={getSLAInfo}
                />
              )}
              {activePage === 'summary' && (
                <Summary complaints={complaints} onWardClick={setWardModal} />
              )}
              {activePage === 'officers' && <HierarchyPage />}
              {activePage === 'admin' && (
                <AdminDashboard
                  complaints={complaints}
                  announcement={announcement}
                  setAnnouncement={setAnnouncement}
                />
              )}
              {activePage === 'report' && (
                <FileReport
                  onSubmit={(c) => {
                    addComplaint(c);
                    showToast(`✅ Report ${c.id} submitted & routed!`, 'success');
                  }}
                  showToast={showToast}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Ward Modal */}
      {wardModal && (
        <WardModal
          ward={wardModal}
          complaints={complaints}
          onClose={() => setWardModal(null)}
          onViewComplaints={() => { handleNav('complaints'); setWardModal(null); }}
        />
      )}

      {/* Complaint Modal — with GPS proof-of-resolution */}
      {complaintModal && (
        <ComplaintModal
          complaint={complaintModal}
          onClose={() => setComplaintModal(null)}
          onResolveWithPhoto={async (id, photo, officer) => {
            const result = await resolveWithPhoto(id, photo, officer);
            if (result.ok) {
              showToast('✅ Complaint resolved with GPS verification!', 'success');
              setComplaintModal(prev => prev ? { ...prev, resolved: true, status: 'Resolved', resolutionPhoto: photo, gpsVerified: true } : null);
            } else {
              showToast(`🚫 ${result.error}`, 'error');
            }
            return result;
          }}
          onResolve={(id) => {
            resolveComplaint(id);
            showToast('✅ Complaint marked as resolved', 'success');
          }}
        />
      )}

      {/* File Report Modal */}
      {reportModal && (
        <FileReportModal
          onClose={() => setReportModal(false)}
          onSubmit={(c) => {
            addComplaint(c);
            showToast(`✅ Report ${c.id} submitted!`, 'success');
          }}
          showToast={showToast}
        />
      )}

      <ChatBot onOpenReport={() => setReportModal(true)} />
      <ToastContainer toasts={toasts} />
    </>
  );
}
