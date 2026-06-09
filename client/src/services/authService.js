// Service for authentication API calls
import axios from 'axios';

const API_URL = '/api/auth';

// Configure axios to include credentials (cookies) in all requests
axios.defaults.withCredentials = true;

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
 * Validate the stored JWT cookie and return fresh user data.
 * Called on app mount to check whether the session is still valid.
 */
export const getMe = async () => {
  const response = await axios.get(`${API_URL}/me`);
  return response.data;
};