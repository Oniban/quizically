// Protected route component to restrict access to authenticated users
import React, { lazy, Suspense, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import Loader from './Loader';

const Login = lazy(() => import('../pages/Auth/Login'));

const ProtectedRoute = () => {
  const { user, loading, authError, refreshUser, sessionExpired } = useAuth();
  const [retrying, setRetrying] = useState(false);
  const location = useLocation();

  if (loading) return <Loader context="session" />;

  if (!user && authError) {
    const retry = async () => {
      setRetrying(true);
      try {
        await refreshUser();
      } catch {
        // The context keeps the error visible until a session check succeeds.
      } finally {
        setRetrying(false);
      }
    };
    return (
      <section className="max-w-lg mx-auto bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md">
        <h1 className="text-2xl font-bold mb-3">Unable to check your session</h1>
        <p role="alert" className="mb-6">{authError}</p>
        <button type="button" onClick={retry} disabled={retrying} className="px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50">
          {retrying ? 'Checking session...' : 'Try again'}
        </button>
      </section>
    );
  }

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search + location.hash }} />;

  return <>
    {/* Keep work mounted during reauthentication; a different account starts fresh. */}
    <div key={user._id} hidden={sessionExpired} inert={sessionExpired || undefined}><Outlet /></div>
    {sessionExpired && <section aria-label="Session recovery">
      <h1 className="text-2xl font-bold text-center">Your session has expired</h1>
      <p className="text-center mt-3">Sign in to continue. Your work is kept on this page for the same account; retry the interrupted action after signing in.</p>
      <Suspense fallback={<Loader context="session" />}><Login embedded /></Suspense>
    </section>}
  </>;
};

export default ProtectedRoute;
