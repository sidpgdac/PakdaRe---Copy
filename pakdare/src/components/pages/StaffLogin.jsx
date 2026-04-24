import React, { useState } from 'react';
import { supabase } from '../../supabase';
import { motion } from 'framer-motion';

export default function StaffLogin({ setActivePage, showToast }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      showToast('✅ Logged in successfully!', 'success');
      setActivePage('dashboard');
    } catch (error) {
      showToast(`🚫 Login failed: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      className="page-content"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="section-card" style={{ maxWidth: '400px', margin: '2rem auto' }}>
        <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Staff Portal Login</h2>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="ui-input"
              style={{ width: '100%' }}
              placeholder="officer@bmc.gov.in"
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="ui-input"
              style={{ width: '100%' }}
              placeholder="••••••••"
            />
          </div>
          <button 
            type="submit" 
            className="btn-primary"
            disabled={loading}
            style={{ marginTop: '1rem', padding: '0.8rem' }}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </motion.div>
  );
}
