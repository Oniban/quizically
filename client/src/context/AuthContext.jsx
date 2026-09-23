// Context for authentication state management
import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { getMe, logoutUser } from '../services/authService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const requestVersion = useRef(0);

  const refreshUser = useCallback(async () => {
    const version = ++requestVersion.current;
    try {
      const data = await getMe();
      if (version === requestVersion.current) {
        setUser(data.user);
        setAuthError(null);
      }
      return data.user;
    } catch (error) {
      if (version === requestVersion.current) {
        if (error.response?.status === 401) {
          setUser(null);
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
    refreshUser().catch(() => {});
    return () => { requestVersion.current += 1; };
  }, [refreshUser]);

  const login = useCallback((userData) => {
    requestVersion.current += 1;
    setUser(userData);
    setAuthError(null);
    setLoading(false);
  }, []);

  const logout = useCallback(async () => {
    await logoutUser();
    requestVersion.current += 1;
    setUser(null);
    setAuthError(null);
    setLoading(false);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, authError, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};
