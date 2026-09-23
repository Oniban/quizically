// Login page component
import React, { useState, useEffect, useEffectEvent } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { loginUser, googleLogin, safeReturnTo } from '../../services/authService';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const Login = () => {
  const { register, handleSubmit, formState: { errors } } = useForm({ mode: 'onBlur' });
  const { login, user } = useAuth();
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = safeReturnTo(location.state?.from);

  // Redirect if already logged in
  useEffect(() => {
    if (user) navigate(returnTo, { replace: true });
  }, [user, navigate, returnTo]);

  // ── Google One Tap / GSI button init ──────────────────────────────────────
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let active = true;

    const initGoogle = () => {
      if (!active || !window.google) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => { if (active) handleGoogleCredential(response); },
      });
      window.google.accounts.id.renderButton(
        document.getElementById('google-signin-btn'),
        { theme: 'outline', size: 'large', width: '100%', text: 'signin_with' }
      );
    };

    // Load GSI script if not already present
    let script = document.getElementById('google-gsi-script');
    const onError = () => setServerError('Google sign-in could not load. You can still sign in with email.');
    if (!script) {
      script = document.createElement('script');
      script.id = 'google-gsi-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
    script.addEventListener('load', initGoogle);
    script.addEventListener('error', onError);
    initGoogle();
    return () => {
      active = false;
      script.removeEventListener('load', initGoogle);
      script.removeEventListener('error', onError);
    };
  }, []);

  const handleGoogleCredential = useEffectEvent(async ({ credential }) => {
    if (loading) return;
    setLoading(true);
    setServerError('');
    try {
      const data = await googleLogin(credential);
      login(data.user);
    } catch (err) {
      setServerError(err.response?.data?.message || 'Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  });

  // ── Email / Password submit ───────────────────────────────────────────────
  const onSubmit = async (data) => {
    setLoading(true);
    setServerError('');
    try {
      const response = await loginUser(data);
      login(response.user);
    } catch (error) {
      setServerError(error.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg transition-colors">
      <h2 className="text-3xl font-bold mb-6 text-center text-indigo-600 dark:text-indigo-400">
        Welcome Back
      </h2>

      {/* Error banner */}
      {serverError && (
        <div role="alert" className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
          {serverError}
        </div>
      )}

      {/* Google Sign-In */}
      {GOOGLE_CLIENT_ID && (
        <>
          <div id="google-signin-btn" className="w-full mb-4" />
          <div className="flex items-center gap-3 mb-4">
            <hr className="flex-1 border-gray-300 dark:border-gray-600" />
            <span className="text-xs text-gray-400 uppercase tracking-wide">or</span>
            <hr className="flex-1 border-gray-300 dark:border-gray-600" />
          </div>
        </>
      )}

      {/* Email / Password form */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            {...register('email', {
              required: 'Email is required',
              pattern: {
                value: /^\S+@\S+\.\S+$/,
                message: 'Enter a valid email address',
              },
            })}
            className="w-full p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 outline-none transition"
            placeholder="john@example.com"
            aria-invalid={errors.email ? 'true' : 'false'}
          />
          {errors.email && (
            <p role="alert" className="text-red-500 text-xs mt-1">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              {...register('password', { required: 'Password is required' })}
              className="w-full p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 outline-none transition pr-10"
              placeholder="••••••••"
              aria-invalid={errors.password ? 'true' : 'false'}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs select-none"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          {errors.password && (
            <p role="alert" className="text-red-500 text-xs mt-1">{errors.password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>

      <p className="mt-4 text-center text-gray-500 dark:text-gray-400 text-sm">
        Don't have an account?{' '}
        <Link to="/signup" state={{ from: returnTo }} className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
          Sign up here
        </Link>
      </p>
    </div>
  );
};

export default Login;
