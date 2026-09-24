import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import Login from './Login';
import Signup from './Signup';
import { AuthContext } from '../../context/AuthContext';
import { loginUser, registerUser } from '../../services/authService';

vi.mock('../../services/authService', async (original) => ({
  ...await original(), loginUser: vi.fn(), registerUser: vi.fn(),
}));

describe('password byte validation', () => {
  for (const [name, Page, service] of [['login', Login, loginUser], ['signup', Signup, registerUser]]) {
    it(`rejects a multibyte password over 72 bytes before ${name}`, async () => {
      render(<MemoryRouter><AuthContext.Provider value={{ user: null, login: vi.fn() }}><Page /></AuthContext.Provider></MemoryRouter>);
      const password = `Aa1${'é'.repeat(35)}`;
      fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'player@example.com' } });
      fireEvent.change(screen.getByLabelText('Password', { exact: true }), { target: { value: password } });
      if (name === 'signup') {
        fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Test Player' } });
        fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: password } });
      }
      fireEvent.click(screen.getByRole('button', { name: name === 'signup' ? 'Create Account' : 'Sign In' }));
      expect(await screen.findByRole('alert')).toHaveTextContent('72 UTF-8 bytes');
      expect(service).not.toHaveBeenCalled();
    });
  }
});
