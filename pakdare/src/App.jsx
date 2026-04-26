import { useState, useEffect, useCallback, useMemo, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import LoadingScreen from './components/LoadingScreen';
import TickerBar from './components/TickerBar';
import Header from './components/Header';
import NavTabs from './components/NavTabs';
import MapPage from './components/pages/MapPage';
import FileReport from './components/pages/FileReport';
import PublicComplaints from './components/pages/PublicComplaints';
import StaffLogin from './components/pages/StaffLogin';
import TrackComplaint from './components/pages/TrackComplaint';
import WardModal from './components/modals/WardModal';
import ComplaintModal from './components/modals/ComplaintModal';
import ChatBot from './components/ChatBot';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastContainer, useToast } from './components/ui/Toast';
import { useComplaints } from './hooks/useComplaints';
import { useSLAEngine } from './hooks/useSLAEngine';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useModalStore } from './store/useModalStore';

// Lazy-load staff/admin pages — citizens never load these chunks
const Dashboard      = lazy(() => import('./components/pages/Dashboard'));
const Complaints     = lazy(() => import('./components/pages/Complaints'));
const Summary        = lazy(() => import('./components/pages/Summary'));
const HierarchyPage  = lazy(() => import('./components/pages/HierarchyPage'));
const AdminDashboard = lazy(() => import('./components/pages/AdminDashboard'));
const MyCasesPage    = lazy(() => import('./components/pages/MyCasesPage'));
const LeaderboardPage = lazy(() => import('./components/pages/LeaderboardPage'));

const PAGE_VARIANTS = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] } },
  exit:    { opacity: 0, y: -6, transition: { duration: 0.16 } },
};

// Skeleton fallback for lazy pages
function PageSkeleton() {
  return (
    <div className="page">
      <div className="page-hdr">
        <div className="skeleton" style={{ width: 260, height: 28, borderRadius: 6, marginBottom: 8 }} />
        <div className="skeleton" style={{ width: 320, height: 16, borderRadius: 4 }} />
      </div>
      <div className="stats-grid">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="sc">
            <div className="skeleton" style={{ width: 36, height: 36, borderRadius: '50%' }} />
            <div className="sc-row" style={{ marginTop: 10 }}>
              <div className="skeleton" style={{ width: 48, height: 24, borderRadius: 4, marginBottom: 6 }} />
              <div className="skeleton" style={{ width: 90, height: 13, borderRadius: 4 }} />
            </div>
          </div>
        ))}
      </div>
      <div className="tcard" style={{ padding: 20 }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton" style={{ width: '100%', height: 56, borderRadius: 10, marginBottom: 10 }} />
        ))}
      </div>
    </div>
  );
}

// Guard: redirect to login with a helpful message instead of silently going to map
function StaffGuard({ children }) {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  if (authLoading) return <PageSkeleton />;
  if (!user) {
    return <Navigate to="/login" state={{ from: location, reason: 'auth' }} replace />;
  }
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}

function AppContent() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [loading, setLoading]   = useState(true);
  const [mode,    setMode]      = useState('real');
  const [theme,          setTheme]          = useState(() => localStorage.getItem('pakdare-theme') || 'dark');
  const [announcement,   setAnnouncement]   = useState(() => localStorage.getItem('pakdare-ann') || '');

  const { toasts, showToast } = useToast();
  const {
    complaints, loading: dataLoading, fetchError, isDemoMode,
    addComplaint, resolveComplaint, resolveWithPhoto,
    updateComplaint, seedDemo, clearDemo, fetchComplaintDetail, refetch,
  } = useComplaints(mode);

  const { user, loading: authLoading } = useAuth();

  // ── Modal state lives in Zustand — no re-render of full app shell ──
  const {
    wardModal, complaintModal,
    openWardModal, closeWardModal,
    openComplaintModal, closeComplaintModal, patchComplaintModal,
  } = useModalStore();

  // Persist & apply theme
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

  useEffect(() => { localStorage.setItem('pakdare-ann', announcement); }, [announcement]);

  const onBreach = useCallback((c) => {
    if (user) showToast(`🚨 SLA Breached: ${c.id} — ${c.ward} Ward (${c.severity})`, 'error');
  }, [user, showToast]);

  const { getSLAInfo, getBreachedComplaints } = useSLAEngine({ complaints, onBreach, updateComplaint });
  const breachCount    = useMemo(() => getBreachedComplaints().length, [getBreachedComplaints]);
  const unresolvedCount = useMemo(() => complaints.filter(c => !c.resolved).length, [complaints]);

  const handleComplaintDetail = useCallback(async (c) => {
    openComplaintModal(c);
    const full = await fetchComplaintDetail(c.id);
    if (full) openComplaintModal(full);
  }, [fetchComplaintDetail, openComplaintModal]);

  if (loading) return <LoadingScreen onEnter={() => setLoading(false)} />;

  // Derive active page from URL for NavTabs highlight
  const activePage = location.pathname.replace('/', '') || 'map';

  return (
    <>
      <TickerBar />

      {/* DEMO MODE banner — prominent, can't be missed */}
      {isDemoMode && (
        <div className="demo-mode-banner">
          <span className="demo-mode-icon">🧪</span>
          <span className="demo-mode-text">DEMO MODE — Showing sample data. Real database unavailable.</span>
          <button className="demo-mode-retry" onClick={refetch}>Retry Connection</button>
        </div>
      )}

      {/* DB error banner (non-demo errors) */}
      {fetchError && !isDemoMode && !dataLoading && (
        <div className="db-error-bar">
          <span style={{ fontWeight: 700 }}>⚠️ Database error:</span>
          <span className="db-error-msg">{fetchError}</span>
          <button className="db-error-retry" onClick={refetch}>Retry</button>
        </div>
      )}

      {dataLoading && <div className="tab-loader-bar" />}

      <Header
        complaints={complaints}
        dbStatus={dataLoading ? 'syncing' : 'conn'}
        theme={theme}
        setTheme={setTheme}
        onLogoClick={() => navigate(user ? '/dashboard' : '/map')}
      />

      <NavTabs
        active={activePage}
        navigate={navigate}
        complaintCount={unresolvedCount}
        breachCount={breachCount}
      />

      <div className={`container${activePage === 'map' ? ' container-map' : ''}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            variants={PAGE_VARIANTS}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <Routes location={location}>
              {/* ── PUBLIC ROUTES ── */}
              <Route path="/" element={<Navigate to="/map" replace />} />

              <Route path="/map" element={
                <ErrorBoundary>
                  <>
                    {announcement && (
                      <div className="ann-banner">
                        <span className="ann-icon">📢</span>
                        <span className="ann-text">{announcement}</span>
                      </div>
                    )}
                    <MapPage
                      complaints={complaints}
                      onWardClick={openWardModal}
                      fetchComplaintDetail={fetchComplaintDetail}
                      onOpenReport={() => navigate('/report')}
                    />
                  </>
                </ErrorBoundary>
              } />

              <Route path="/report" element={
                <ErrorBoundary>
                  <FileReport
                    onSubmit={async (c) => {
                      const result = await addComplaint(c);
                      if (result?.ok === false) {
                        showToast(`🚫 Failed to save report: ${result.error}`, 'error');
                        return;
                      }
                      showToast(`✅ Report ${c.id} submitted & routed!`, 'success');
                      navigate(`/track/${c.id}`, { state: { justFiled: true } });
                    }}
                    showToast={showToast}
                    complaints={complaints}
                  />
                </ErrorBoundary>
              } />

              <Route path="/gallery" element={
                <ErrorBoundary>
                  <PublicComplaints complaints={complaints} fetchComplaintDetail={fetchComplaintDetail} />
                </ErrorBoundary>
              } />

              <Route path="/track/:id" element={
                <ErrorBoundary>
                  <TrackComplaint complaints={complaints} fetchComplaintDetail={fetchComplaintDetail} />
                </ErrorBoundary>
              } />

              <Route path="/leaderboard" element={
                <ErrorBoundary>
                  <Suspense fallback={<PageSkeleton />}>
                    <LeaderboardPage complaints={complaints} />
                  </Suspense>
                </ErrorBoundary>
              } />

              <Route path="/login" element={
                <StaffLogin
                  showToast={showToast}
                  onSuccess={() => {
                    const role = localStorage.getItem('pakdare-role');
                    navigate(role === 'admin' ? '/admin' : '/dashboard');
                  }}
                />
              } />

              {/* ── STAFF-ONLY ROUTES ── */}
              <Route path="/dashboard" element={
                <StaffGuard>
                  <ErrorBoundary>
                    <Suspense fallback={<PageSkeleton />}>
                      <Dashboard
                        complaints={complaints}
                        navigate={navigate}
                        onWardClick={openWardModal}
                        seedDemo={seedDemo}
                        clearDemo={clearDemo}
                      />
                    </Suspense>
                  </ErrorBoundary>
                </StaffGuard>
              } />

              <Route path="/complaints" element={
                <StaffGuard>
                  <ErrorBoundary>
                    <Suspense fallback={<PageSkeleton />}>
                      <Complaints
                        complaints={complaints}
                        onDetail={handleComplaintDetail}
                        onAlertBranch={() => showToast('🚨 Alert sent to Insecticide Branch!', 'warn')}
                        getSLAInfo={getSLAInfo}
                      />
                    </Suspense>
                  </ErrorBoundary>
                </StaffGuard>
              } />

              <Route path="/summary" element={
                <StaffGuard>
                  <ErrorBoundary>
                    <Suspense fallback={<PageSkeleton />}>
                      <Summary complaints={complaints} onWardClick={openWardModal} />
                    </Suspense>
                  </ErrorBoundary>
                </StaffGuard>
              } />

              <Route path="/my-cases" element={
                <StaffGuard>
                  <ErrorBoundary>
                    <Suspense fallback={<PageSkeleton />}>
                      <MyCasesPage
                        complaints={complaints}
                        onDetail={handleComplaintDetail}
                        getSLAInfo={getSLAInfo}
                      />
                    </Suspense>
                  </ErrorBoundary>
                </StaffGuard>
              } />

              <Route path="/officers" element={
                <StaffGuard>
                  <ErrorBoundary>
                    <Suspense fallback={<PageSkeleton />}>
                      <HierarchyPage />
                    </Suspense>
                  </ErrorBoundary>
                </StaffGuard>
              } />

              <Route path="/admin" element={
                <StaffGuard>
                  <ErrorBoundary>
                    <Suspense fallback={<PageSkeleton />}>
                      <AdminDashboard
                        complaints={complaints}
                        announcement={announcement}
                        setAnnouncement={setAnnouncement}
                      />
                    </Suspense>
                  </ErrorBoundary>
                </StaffGuard>
              } />

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/map" replace />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Ward Modal */}
      {wardModal && (
        <WardModal
          ward={wardModal}
          complaints={complaints}
          onClose={closeWardModal}
          onViewComplaints={() => { navigate('/complaints'); closeWardModal(); }}
        />
      )}

      {/* Complaint Modal */}
      {complaintModal && (
        <ComplaintModal
          complaint={complaintModal}
          onClose={closeComplaintModal}
          onResolveWithPhoto={async (id, photo, officer) => {
            const result = await resolveWithPhoto(id, photo, officer);
            if (result.ok) {
              showToast('✅ Complaint resolved with GPS verification!', 'success');
              patchComplaintModal({ resolved: true, status: 'Resolved', resolutionPhoto: photo, gpsVerified: true });
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

      <ChatBot onOpenReport={() => navigate('/report')} />
      <ToastContainer toasts={toasts} />
    </>
  );
}
