import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabase';

const AuthContext = createContext({
  user: null,
  role: 'citizen',
  staffProfile: null,
  loading: true,
  signOut: async () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser]               = useState(null);
  const [role, setRole]               = useState('citizen');
  const [staffProfile, setStaffProfile] = useState(null);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const bail = setTimeout(() => {
      setUser(null); setRole('citizen'); setStaffProfile(null); setLoading(false);
    }, 5000);

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        clearTimeout(bail);
        if (session?.user) {
          setUser(session.user);
          fetchRole(session.user);
        } else {
          setUser(null); setRole('citizen'); setStaffProfile(null); setLoading(false);
        }
      })
      .catch(() => {
        clearTimeout(bail);
        setUser(null); setRole('citizen'); setStaffProfile(null); setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        fetchRole(session.user);
      } else {
        setUser(null); setRole('citizen'); setStaffProfile(null); setLoading(false);
      }
    });

    return () => { clearTimeout(bail); subscription.unsubscribe(); };
  }, []);

  const fetchRole = async (authUser) => {
    try {
      if (!supabase) { setRole('staff'); setLoading(false); return; }

      // Try fetching from staff_profiles table (may not exist in all deployments)
      const { data, error } = await supabase
        .from('staff_profiles')
        .select('role, name, ward_id, designation')
        .eq('user_id', authUser.id)
        .single();

      if (!error && data?.role) {
        // roles: 'admin' | 'staff' | 'officer'
        setRole(data.role);
        setStaffProfile(data);
      } else {
        // Fallback: check user_metadata (set when creating user via Supabase Dashboard)
        const metaRole = authUser.user_metadata?.role;
        if (metaRole === 'officer') {
          setRole('officer');
          setStaffProfile({
            name:        authUser.user_metadata?.name || authUser.email?.split('@')[0],
            designation: authUser.user_metadata?.designation || 'Field Officer',
            ward_id:     authUser.user_metadata?.ward_id || null,
            role:        'officer',
          });
        } else {
          // Default: full staff access for any authenticated user
          setRole('staff');
          setStaffProfile(null);
        }
      }
    } catch {
      setRole('staff');
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase?.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, role, staffProfile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
