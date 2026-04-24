import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabase';

const AuthContext = createContext({
  user: null,
  role: 'citizen',
  loading: true,
  signOut: async () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('citizen');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      // No Supabase client — proceed immediately as unauthenticated
      setLoading(false);
      return;
    }

    // Safety net: if auth check takes > 5 s, unblock the app
    const bail = setTimeout(() => {
      setUser(null);
      setRole('citizen');
      setLoading(false);
    }, 5000);

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        clearTimeout(bail);
        if (session?.user) {
          setUser(session.user);
          fetchRole(session.user.id);
        } else {
          setUser(null);
          setRole('citizen');
          setLoading(false);
        }
      })
      .catch(() => {
        clearTimeout(bail);
        setUser(null);
        setRole('citizen');
        setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        fetchRole(session.user.id);
      } else {
        setUser(null);
        setRole('citizen');
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(bail);
      subscription.unsubscribe();
    };
  }, []);

  const fetchRole = async (userId) => {
    try {
      // Any authenticated user is staff for now
      setRole('staff');
    } catch (error) {
      console.error('Error fetching role:', error);
      setRole('citizen');
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase?.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
