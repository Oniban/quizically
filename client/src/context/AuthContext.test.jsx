import React, { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from './AuthContext';
import useAuth from '../hooks/useAuth';
import ProtectedRoute from '../components/ProtectedRoute';
import { getMe, logoutUser } from '../services/authService';
import { member } from '../test/fixtures';

vi.mock('../services/authService', () => ({ getMe: vi.fn(), logoutUser: vi.fn() }));

beforeEach(() => {
  getMe.mockReset().mockResolvedValue({ user: member });
  logoutUser.mockReset().mockResolvedValue(undefined);
});

function SessionControls() {
  const { user, logout } = useAuth();
  const [error, setError] = useState('');
  return <>
    <h1>Private account for {user.name}</h1>
    <button onClick={async () => {
      try { await logout(); } catch { setError('Sign out failed'); }
    }}>Sign out</button>
    {error && <p role="alert">{error}</p>}
  </>;
}

function LoginDestination() {
  const location = useLocation();
  return <><h1>Sign in</h1><p>Return to: {location.state?.from}</p></>;
}

function renderSession() {
  render(<MemoryRouter initialEntries={['/private?tab=stats#history']}><AuthProvider><Routes>
    <Route element={<ProtectedRoute />}><Route path="/private" element={<SessionControls />} /></Route>
    <Route path="/login" element={<LoginDestination />} />
  </Routes></AuthProvider></MemoryRouter>);
  return userEvent.setup();
}

describe('authentication and protected routes', () => {
  it('shows session loading without exposing private content or redirecting early', () => {
    getMe.mockReturnValue(new Promise(() => {}));
    renderSession();
    expect(screen.getByRole('status')).toHaveTextContent('Checking your session...');
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('admits an authenticated member', async () => {
    renderSession();
    expect(await screen.findByRole('heading', { name: 'Private account for Ada' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Sign in' })).not.toBeInTheDocument();
  });

  it('redirects a confirmed signed-out session and preserves path, search, and hash', async () => {
    getMe.mockRejectedValue({ response: { status: 401 } });
    renderSession();
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeVisible();
    expect(screen.getByText('Return to: /private?tab=stats#history')).toBeVisible();
  });

  it('does not treat a network failure as logout and allows session-check retry', async () => {
    getMe.mockRejectedValueOnce(new Error('Offline'));
    const user = renderSession();
    expect(await screen.findByRole('alert')).toHaveTextContent('We could not check your session.');
    expect(screen.queryByRole('heading', { name: 'Sign in' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'Private account for Ada' })).toBeVisible();
    expect(getMe).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('preserves the session when logout fails and clears it only after successful retry', async () => {
    logoutUser.mockRejectedValueOnce(new Error('Offline'));
    const user = renderSession();
    await user.click(await screen.findByRole('button', { name: 'Sign out' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Sign out failed');
    expect(screen.getByRole('heading', { name: 'Private account for Ada' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Sign in' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeVisible();
    expect(logoutUser).toHaveBeenCalledTimes(2);
  });
});
