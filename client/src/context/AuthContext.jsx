// Context for authentication state management
import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { getMe, logoutUser } from '../services/authService';
import { advanceSession, onSessionExpired } from '../services/sessionEvents';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const requestVersion = useRef(0);

  const refreshUser = useCallback(async () => {
    const version = ++requestVersion.current;
    try {
      const data = await getMe();
      if (version === requestVersion.current) {
        setUser(data.user);
        setSessionExpired(false);
        setAuthError(null);
      }
      return data.user;
    } catch (error) {
      if (version === requestVersion.current) {
        if (error.response?.status === 401) {
          setSessionExpired(true);
          setAuthError(null);
        } else {
          setAuthError('We could not check your session. Check your connection and try again.');
        }
      }
      throw error;
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onSessionExpired(() => {
      requestVersion.current += 1;
      setSessionExpired(true);
      setAuthError(null);
      setLoading(false);
    });
    refreshUser().catch(() => {});
    return () => { requestVersion.current += 1; unsubscribe(); };
  }, [refreshUser]);

  const login = useCallback((userData) => {
    advanceSession();
    requestVersion.current += 1;
    setUser(userData);
    setSessionExpired(false);
    setAuthError(null);
    setLoading(false);
  }, []);

  const logout = useCallback(async () => {
    await logoutUser();
    advanceSession();
    requestVersion.current += 1;
    setUser(null);
    setSessionExpired(false);
    setAuthError(null);
    setLoading(false);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, authError, refreshUser, sessionExpired }}>
      {children}
    </AuthContext.Provider>
  );
};
