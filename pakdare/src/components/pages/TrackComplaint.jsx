import { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { WARDS } from '../../data/wardData';

const STATUS_STEPS = ['Filed', 'Assigned', 'In Progress', 'Resolved'];

function getStepIndex(complaint) {
  if (!complaint) return 0;
  if (complaint.resolved || complaint.status === 'Resolved') return 3;
  if (complaint.status === 'In Progress' || complaint.status === 'Escalated') return 2;
  if (complaint.assignedTo && complaint.assignedTo !== 'Pending Assignment') return 1;
  return 0;
}

const SEV_COLOR = { critical: 'var(--red)', severe: 'var(--orange)', moderate: 'var(--yellow)', minor: 'var(--green)' };

export default function TrackComplaint({ complaints, fetchComplaintDetail }) {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [complaint, setComplaint] = useState(null);
  const [searchMode, setSearchMode] = useState('id'); // 'id' | 'phone'
  const [phoneComplaints, setPhoneComplaints] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (searchMode === 'phone') {
      setComplaint(null);
    }
  }, [searchMode]);

  useEffect(() => {
    if (!id || searchMode === 'phone') { setLoading(false); return; }
    const local = complaints.find(c => c.id === id);
    if (local) { setComplaint(local); setLoading(false); return; }
    fetchComplaintDetail(id).then(data => {
      setComplaint(data || null);
      setLoading(false);
    });
  }, [id, complaints, fetchComplaintDetail, searchMode]);

  const stepIndex = getStepIndex(complaint);
  const sevColor  = SEV_COLOR[complaint?.severity] || 'var(--blue2)';

  const handleSearch = async (e) => {
    e.preventDefault();
    const q = searchId.trim();
    if (!q) return;

    if (searchMode === 'id') {
      navigate(`/track/${q}`);
    } else {
      // Search by phone — we search in 'desc' because phone is currently stored there
      setSearching(true);
      setComplaint(null);
      
      // Filter local list for performance
      const matches = complaints.filter(c => c.desc?.includes(q));
      setPhoneComplaints(matches);
      setSearching(false);
    }
  };

  return (
    <div className="page">
      <div className="page-hdr">
        <h1 className="page-title">Track Your Record</h1>
        <p className="page-sub">Find your reports using Complaint ID or Phone Number</p>
      </div>

      {/* Search Mode Toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, justifyContent: 'center' }}>
        <button 
          className={`chip ${searchMode === 'id' ? 'active' : ''}`}
          onClick={() => setSearchMode('id')}
        >
          🔍 By ID
        </button>
        <button 
          className={`chip ${searchMode === 'phone' ? 'active' : ''}`}
          onClick={() => setSearchMode('phone')}
        >
          📱 By Phone
        </button>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="track-search-form">
        <input
          className="fi track-search-input"
          value={searchId}
          onChange={e => setSearchId(e.target.value)}
          placeholder={searchMode === 'id' ? "e.g. BMC-2504-4821" : "Enter your mobile number"}
          type={searchMode === 'phone' ? "tel" : "text"}
          autoComplete="off"
          spellCheck={false}
        />
        <button type="submit" className="btn-primary" style={{ flexShrink: 0 }} disabled={searching}>
          {searching ? '...' : '🔍 Find'}
        </button>
      </form>

      {/* Just filed banner */}
      {justFiled && !loading && complaint && (
        <motion.div
          className="track-filed-banner"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span style={{ fontSize: 20 }}>✅</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Report submitted successfully!</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              Bookmark this page to check back on your complaint's progress.
            </div>
          </div>
        </motion.div>
      )}

      {/* Phone Search Results */}
      {searchMode === 'phone' && !searching && phoneComplaints.length > 0 && (
        <div className="track-phone-results" style={{ marginTop: 24 }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12, fontWeight: 600 }}>
            Found {phoneComplaints.length} records linked to this number:
          </div>
          <div className="pg-list" style={{ gap: 10 }}>
            {phoneComplaints.map(c => (
              <div 
                key={c.id} 
                className="pg-row-wrapper" 
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  setComplaint(c);
                  setSearchId(c.id);
                  setSearchMode('id');
                  navigate(`/track/${c.id}`);
                }}
              >
                <div className="pg-row-hdr" style={{ padding: '14px 18px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{c.category?.replace(/-/g, ' ')}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{c.location} · {new Date(c.time).toLocaleDateString()}</div>
                  </div>
                  <div className={`status-badge ${c.resolved ? 'sb-low' : 'sb-high'}`} style={{ fontSize: 10 }}>
                    {c.resolved ? 'Resolved' : 'Pending'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No results for phone */}
      {searchMode === 'phone' && !searching && phoneComplaints.length === 0 && searchId.length > 5 && (
        <div className="track-empty" style={{ marginTop: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🕵️</div>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            No records found for this phone number.
          </p>
        </div>
      )}

      {/* No ID entered */}
      {!id && !loading && searchMode === 'id' && (
        <div className="track-empty">
          <div style={{ fontSize: 56, marginBottom: 12 }}>📋</div>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Enter your complaint ID above to track its status.
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 8 }}>
            Don't have an ID? <Link to="/report" style={{ color: 'var(--blue2)' }}>File a new report →</Link>
          </p>
        </div>
      )}

      {/* Loading */}
      {id && loading && (
        <div className="tcard" style={{ padding: 24 }}>
          <div className="skeleton" style={{ width: 180, height: 20, borderRadius: 4, marginBottom: 16 }} />
          <div className="skeleton" style={{ width: '100%', height: 80, borderRadius: 12, marginBottom: 12 }} />
          <div className="skeleton" style={{ width: '100%', height: 60, borderRadius: 12 }} />
        </div>
      )}

      {/* Not found */}
      {id && !loading && !complaint && (
        <div className="tcard track-not-found">
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔎</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', marginBottom: 8 }}>
            Complaint not found
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, maxWidth: 320 }}>
            No complaint with ID <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--ff-mono)' }}>{id}</strong> was found.
            Double-check the ID and try again.
          </p>
          <Link to="/report" className="btn-primary" style={{ marginTop: 16, display: 'inline-block' }}>
            File a New Report
          </Link>
        </div>
      )}

      {/* Complaint found */}
      {id && !loading && complaint && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          {/* Status progress */}
          <div className="tcard track-status-card">
            <div className="track-id-row">
              <div>
                <div className="track-id-label">Complaint ID</div>
                <div className="track-id-val" style={{ fontFamily: 'var(--ff-mono)' }}>{complaint.id}</div>
              </div>
              <span className={`status-badge ${complaint.resolved ? 'sb-low' : 'sb-high'}`}>
                {complaint.resolved ? '✅ Resolved' : '⏳ Pending'}
              </span>
            </div>

            {/* Progress stepper */}
            <div className="track-stepper">
              {STATUS_STEPS.map((step, i) => (
                <div key={step} className={`track-step${i <= stepIndex ? ' done' : ''}`}>
                  <div className="track-step-dot">
                    {i < stepIndex ? '✓' : i === stepIndex ? '●' : '○'}
                  </div>
                  <div className="track-step-label">{step}</div>
                  {i < STATUS_STEPS.length - 1 && (
                    <div className={`track-step-line${i < stepIndex ? ' done' : ''}`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Details card */}
          <div className="tcard track-details-card">
            <div className="track-details-grid">
              <div className="track-detail-row">
                <span className="track-detail-label">Category</span>
                <span className="track-detail-val">{complaint.category?.replace(/-/g, ' ')}</span>
              </div>
              <div className="track-detail-row">
                <span className="track-detail-label">Severity</span>
                <span className="track-detail-val" style={{ color: sevColor, fontWeight: 700, textTransform: 'capitalize' }}>
                  {complaint.severity}
                </span>
              </div>
              <div className="track-detail-row">
                <span className="track-detail-label">Ward</span>
                <span className="track-detail-val">{complaint.ward}</span>
              </div>
              {complaint.location && (
                <div className="track-detail-row">
                  <span className="track-detail-label">Location</span>
                  <span className="track-detail-val">{complaint.location}</span>
                </div>
              )}
              <div className="track-detail-row">
                <span className="track-detail-label">Filed on</span>
                <span className="track-detail-val">
                  {new Date(complaint.time).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="track-detail-row">
                <span className="track-detail-label">Assigned to</span>
                <span className="track-detail-val">{complaint.assignedTo || (WARDS.find(w => w.id === complaint.ward)?.wmo)}</span>
              </div>
              <div className="track-detail-row">
                <span className="track-detail-label">Sanitary Inspector</span>
                <span className="track-detail-val">{WARDS.find(w => w.id === complaint.ward)?.siTeam?.[0]?.name || 'Pending'}</span>
              </div>
              <div className="track-detail-row">
                <span className="track-detail-label">Contact (S.I.)</span>
                <a href={`tel:${WARDS.find(w => w.id === complaint.ward)?.siTeam?.[0]?.phone}`} className="track-detail-val" style={{ color: 'var(--blue2)', fontWeight: 700 }}>
                  📞 {WARDS.find(w => w.id === complaint.ward)?.siTeam?.[0]?.phone || 'N/A'}
                </a>
              </div>
              {complaint.resolvedAt && (
                <div className="track-detail-row">
                  <span className="track-detail-label">Resolved on</span>
                  <span className="track-detail-val" style={{ color: 'var(--green2)' }}>
                    {new Date(complaint.resolvedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
              {complaint.resolutionOfficer && (
                <div className="track-detail-row">
                  <span className="track-detail-label">Resolved by</span>
                  <span className="track-detail-val">{complaint.resolutionOfficer}</span>
                </div>
              )}
              {complaint.gpsVerified && (
                <div className="track-detail-row">
                  <span className="track-detail-label">GPS Verified</span>
                  <span className="track-detail-val" style={{ color: 'var(--green2)' }}>✅ On-site verification confirmed</span>
                </div>
              )}
            </div>

            {/* Resolution photo */}
            {complaint.resolutionPhoto && (
              <div style={{ marginTop: 16 }}>
                <div className="track-detail-label" style={{ marginBottom: 8 }}>Resolution Photo</div>
                <img
                  src={complaint.resolutionPhoto}
                  alt="Resolution evidence"
                  style={{ width: '100%', maxWidth: 360, borderRadius: 'var(--r12)', border: '1px solid var(--border)' }}
                />
              </div>
            )}
          </div>

          {/* SLA estimate if not resolved */}
          {!complaint.resolved && (
            <div className="tcard track-sla-card">
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                📅 <strong>Expected resolution:</strong>{' '}
                {complaint.severity === 'critical' ? 'Within 4 hours' :
                 complaint.severity === 'severe'   ? 'Within 12 hours' :
                 complaint.severity === 'moderate' ? 'Within 24 hours' :
                                                     'Within 48 hours'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                SLA based on severity level · Times are from initial filing
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
            <Link to="/report" className="btn-ghost" style={{ fontSize: 13 }}>➕ File Another Report</Link>
            <Link to="/gallery" className="btn-ghost" style={{ fontSize: 13 }}>🖼️ Public Gallery</Link>
          </div>
        </motion.div>
      )}
    </div>
  );
}
