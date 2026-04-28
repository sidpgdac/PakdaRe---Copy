import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';

export default function StaffLogin({ showToast, onSuccess }) {
  const { login } = useAuth();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const location = useLocation();
  const redirectReason = location.state?.reason;

  const [role,     setRole]     = useState('employee'); // 'employee' | 'admin'

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await login(email, password);
      if (error) throw new Error(error);
      // Role comes from the API/JWT — NOT from the UI toggle
      // We just use the toggle as a UX hint for the welcome message
      showToast(`✅ Welcome back, ${role === 'admin' ? 'Administrator' : 'Officer'}!`, 'success');
      onSuccess?.();
    } catch (err) {
      showToast(`🚫 Login failed: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="page"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
    >
      <div className="page-hdr" style={{ textAlign: 'center' }}>
        <h1 className="page-title">BMC Staff Portal</h1>
        <p className="page-sub">Secure access for BMC Officers & Admins</p>
      </div>

      <div style={{ maxWidth: 420, margin: '0 auto' }}>
        {/* Role Selector */}
        <div className="login-role-selector">
          <button 
            className={`role-btn ${role === 'employee' ? 'active' : ''}`}
            onClick={() => setRole('employee')}
          >
            <span className="role-ico">👷</span>
            <div className="role-txt">
              <strong>Employee</strong>
              <span>Officer / Inspector</span>
            </div>
          </button>
          <button 
            className={`role-btn ${role === 'admin' ? 'active' : ''}`}
            onClick={() => setRole('admin')}
          >
            <span className="role-ico">🔐</span>
            <div className="role-txt">
              <strong>Admin</strong>
              <span>Control Centre</span>
            </div>
          </button>
        </div>

        <div className="fcard" style={{ padding: 28, borderRadius: 'var(--r20)' }}>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="fg">
              <label className="flbl">Official Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                required className="fi" placeholder={role === 'admin' ? 'admin@bmc.gov.in' : 'officer@bmc.gov.in'}
                autoComplete="email"
              />
            </div>
            <div className="fg">
              <label className="flbl">Password</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                required className="fi" placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
            <button type="submit" className={`btn-primary ${role === 'admin' ? 'btn-admin' : ''}`} disabled={loading}
              style={{ padding: '14px', marginTop: 6, width: '100%', justifyContent: 'center' }}>
              {loading ? 'Authenticating…' : `Login as ${role === 'admin' ? 'Administrator' : 'Officer'}`}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--text-muted)' }}>
          Not a staff member?{' '}
          <Link to="/report" style={{ color: 'var(--blue2)' }}>Report a health issue →</Link>
        </div>
      </div>
    </motion.div>
  );
}
