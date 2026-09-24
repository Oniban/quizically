import React, { useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from './AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';
import useAuth from '../hooks/useAuth';
import { getMe, loginUser } from '../services/authService';
import { getQuizzes } from '../services/quizService';
import { member } from '../test/fixtures';

const { adapter } = vi.hoisted(() => ({ adapter: vi.fn() }));
vi.mock('axios', async (original) => {
  const actual = (await original()).default;
  return { default: { ...actual, create: (options) => actual.create({ ...options, adapter }) } };
});
vi.mock('../services/authService', async (original) => ({
  ...await original(), getMe: vi.fn(), loginUser: vi.fn(),
}));

function Editor() {
  const { user } = useAuth();
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  return <>
    <h1>Draft for {user.name}</h1>
    <label>Draft<input value={draft} onChange={(event) => setDraft(event.target.value)} /></label>
    <button onClick={() => getQuizzes().catch(() => setError('Request failed'))}>Check catalogue</button>
    {error && <p>{error}</p>}
  </>;
}

const rejectResponse = (config, status = 401) => Promise.reject({ config, response: { status } });

async function openEditor() {
  render(<MemoryRouter initialEntries={['/draft']}><AuthProvider><Routes>
    <Route element={<ProtectedRoute />}><Route path="/draft" element={<Editor />} /></Route>
  </Routes></AuthProvider></MemoryRouter>);
  await screen.findByRole('heading', { name: 'Draft for Ada' });
  fireEvent.change(screen.getByLabelText('Draft'), { target: { value: 'Unsaved question' } });
}

async function signIn() {
  await screen.findByRole('button', { name: 'Sign In' });
  fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'ada@example.com' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'TestPassword123!' } });
  fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
}

beforeEach(() => {
  getMe.mockReset().mockResolvedValue({ user: member });
  loginUser.mockReset().mockResolvedValue({ user: member });
  adapter.mockReset().mockImplementation((config) => rejectResponse(config));
});

describe('session recovery through the quiz API client', () => {
  it('allows inline login and preserves same-account work after a 401', async () => {
    await openEditor();
    fireEvent.click(screen.getByRole('button', { name: 'Check catalogue' }));
    await screen.findByRole('heading', { name: 'Your session has expired' });
    expect(screen.queryByRole('heading', { name: 'Draft for Ada' })).not.toBeInTheDocument();
    await signIn();
    await screen.findByRole('heading', { name: 'Draft for Ada' });
    expect(screen.getByLabelText('Draft')).toHaveValue('Unsaved question');
    expect(screen.queryByRole('region', { name: 'Session recovery' })).not.toBeInTheDocument();
    expect(adapter).toHaveBeenCalledTimes(1); // Never automatically replay an action.
  });

  it('discards the previous account draft when another account signs in', async () => {
    loginUser.mockResolvedValue({ user: { ...member, _id: 'another-user', name: 'Grace' } });
    await openEditor();
    fireEvent.click(screen.getByRole('button', { name: 'Check catalogue' }));
    await signIn();
    await screen.findByRole('heading', { name: 'Draft for Grace' });
    expect(screen.getByLabelText('Draft')).toHaveValue('');
  });

  it.each([undefined, 403, 500])('does not expire the session for status %s', async (status) => {
    adapter.mockImplementation((config) => Promise.reject(status ? { config, response: { status } } : new Error('Offline')));
    await openEditor();
    fireEvent.click(screen.getByRole('button', { name: 'Check catalogue' }));
    await screen.findByText('Request failed');
    expect(screen.getByRole('heading', { name: 'Draft for Ada' })).toBeVisible();
    expect(screen.getByLabelText('Draft')).toHaveValue('Unsaved question');
    expect(screen.queryByRole('region', { name: 'Session recovery' })).not.toBeInTheDocument();
  });

  it('ignores an old request returning 401 after a new login', async () => {
    const pending = [];
    adapter.mockImplementation((config) => new Promise((resolve, reject) => pending.push(() => reject({ config, response: { status: 401 } }))));
    await openEditor();
    fireEvent.click(screen.getByRole('button', { name: 'Check catalogue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Check catalogue' }));
    await waitFor(() => expect(pending).toHaveLength(2));
    await act(async () => pending[0]());
    await signIn();
    await screen.findByRole('heading', { name: 'Draft for Ada' });
    await act(async () => pending[1]());
    expect(screen.getByRole('heading', { name: 'Draft for Ada' })).toBeVisible();
    expect(screen.queryByRole('region', { name: 'Session recovery' })).not.toBeInTheDocument();
  });
});
