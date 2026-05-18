// Service for authentication API calls
import axios from 'axios';

const API_URL = '/api/auth';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const authHeader = (token) => ({
  headers: { Authorization: `Bearer ${token}` },
});

// ─── Email / Password ─────────────────────────────────────────────────────────

export const registerUser = async (userData) => {
  const response = await axios.post(`${API_URL}/register`, userData);
  return response.data;
};

export const loginUser = async (userData) => {
  const response = await axios.post(`${API_URL}/login`, userData);
  return response.data;
};

// ─── Google OAuth ─────────────────────────────────────────────────────────────

/**
 * Send the Google ID token (from Google One Tap / GSI button) to the backend.
 * @param {string} credential - The raw Google credential string
 */
export const googleLogin = async (credential) => {
  const response = await axios.post(`${API_URL}/google`, { credential });
  return response.data;
};

// ─── Session Validation ───────────────────────────────────────────────────────

/**
 * Validate the stored JWT and return fresh user data.
 * Called on app mount to check whether the saved token is still valid.
 */
export const getMe = async (token) => {
  const response = await axios.get(`${API_URL}/me`, authHeader(token));
  return response.data;
};