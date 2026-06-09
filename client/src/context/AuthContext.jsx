// Context for authentication state management
import React, { createContext, useState, useEffect, useCallback } from 'react';
import { getMe } from '../services/authService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, validate the session by calling /api/auth/me
  // The cookie is automatically sent by axios (withCredentials: true)
  useEffect(() => {
    const validateSession = async () => {
      try {
        const data = await getMe();
        // Rehydrate user from server (fresh, authoritative data)
        setUser(data.user);
      } catch {
        // No valid session (cookie expired or missing)
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    validateSession();
  }, []);

  const login = useCallback((userData) => {
    // Cookie is set automatically by the server on login/register
    // Just update the client state
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    // Optionally: call a server endpoint to clear the cookie
    // For now, the cookie will expire naturally (30 days)
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
