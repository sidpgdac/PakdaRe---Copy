import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/axios';

const AuthContext = createContext({
  user: null,
  role: 'citizen',
  staffProfile: null,
  loading: true,
  login: async (email, password) => {},
  signOut: async () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('citizen');
  const [staffProfile, setStaffProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is already logged in on page load
  useEffect(() => {
    const checkUser = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await api.get('/auth/me');
          if (res.data.success) {
            setUser(res.data.user);
            setRole(res.data.user.role || 'citizen');
            // Simplified staff profile mapping for the new DB
            if (res.data.user.role !== 'citizen') {
              setStaffProfile({
                name: res.data.user.name,
                role: res.data.user.role,
              });
            }
          }
        } catch (error) {
          localStorage.removeItem('token');
          setUser(null);
          setRole('citizen');
        }
      }
      setLoading(false);
    };

    checkUser();
  }, []);

  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data.success) {
        localStorage.setItem('token', res.data.token);
        setUser(res.data.user);
        setRole(res.data.user.role || 'citizen');
        
        if (res.data.user.role !== 'citizen') {
          setStaffProfile({
            name: res.data.user.name,
            role: res.data.user.role,
          });
        }
        return { error: null };
      }
    } catch (error) {
      return { error: error.response?.data?.message || 'Login failed' };
    }
  };

  const signOut = async () => {
    localStorage.removeItem('token');
    setUser(null);
    setRole('citizen');
    setStaffProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, role, staffProfile, loading, login, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
