/**
 * AuthContext — global authentication & role state.
 *
 * Persists JWT token in localStorage and exposes:
 *   user  : { id, name, email, role, ... }  | null
 *   token : string | null
 *   login(userData, token) — called after successful login/register
 *   logout()
 *   isTeacher / isStudent — derived boolean helpers
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export function AuthProvider({ children }) {
  const [user, setUser]   = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('dslfa_token'));
  const [loading, setLoading] = useState(true);

  // Attach token to every axios request
  useEffect(() => {
    const interceptor = axios.interceptors.request.use((config) => {
      if (token) config.headers['Authorization'] = `Bearer ${token}`;
      return config;
    });
    return () => axios.interceptors.request.eject(interceptor);
  }, [token]);

  // Rehydrate user from /api/auth/me on page load
  useEffect(() => {
    if (!token) { setLoading(false); return; }
    axios.get(`${API_BASE}/api/auth/me`)
      .then(res => setUser(res.data.user))
      .catch(() => {
        // Token is invalid / expired
        localStorage.removeItem('dslfa_token');
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const login = useCallback((userData, accessToken) => {
    localStorage.setItem('dslfa_token', accessToken);
    setToken(accessToken);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('dslfa_token');
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/auth/me`);
      setUser(res.data.user);
      return res.data.user;
    } catch (err) {
      console.error("Failed to refresh user profile", err);
    }
  }, []);

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    refreshUser,
    isAuthenticated: !!user,
    isTeacher: user?.role === 'teacher' || user?.role === 'facilitator',
    isAdmin: user?.role === 'admin',
    isStudent:  user?.role === 'student',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
