import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost } from '../lib/api';

const AuthContext = createContext(null);

const TOKEN_KEY = 'bookflow_token';
const USER_KEY = 'bookflow_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrapAuth = async () => {
      const u = localStorage.getItem(USER_KEY);
      if (u) {
        try {
          setUser(JSON.parse(u));
        } catch (_) {}
      }

      if (token) {
        try {
          const data = await apiGet('/api/auth/me', { token });
          if (data?.user) {
            localStorage.setItem(USER_KEY, JSON.stringify(data.user));
            setUser(data.user);
          }
        } catch (err) {
          // Backward compatibility: older backend versions may not expose /api/auth/me yet.
          if (err?.status === 404) {
            setLoading(false);
            return;
          }
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    bootstrapAuth();
  }, [token]);

  const isAdmin = !!user?.isAdmin;

  const login = async (email, password) => {
    const data = await apiPost('/api/auth/login', { email, password });
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async (email, password, name) => {
    const data = await apiPost('/api/auth/register', { email, password, name });
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  };

  const getAuthHeader = useCallback(() => (token ? { Authorization: `Bearer ${token}` } : {}), [token]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, getAuthHeader, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
