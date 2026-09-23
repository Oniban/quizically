import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../context/AuthContext';
import { getMe } from '../services/authService';
import { getQuizzes, getRecentQuiz } from '../services/quizService';
import { attempt, member, quiz } from '../test/fixtures';
import Home from './Home';

vi.mock('../services/authService', () => ({ getMe: vi.fn(), logoutUser: vi.fn() }));
vi.mock('../services/quizService', async (importOriginal) => ({
  ...await importOriginal(), getQuizzes: vi.fn(), getRecentQuiz: vi.fn(),
}));

beforeEach(() => {
  getMe.mockReset().mockResolvedValue({ user: member });
  getRecentQuiz.mockReset().mockResolvedValue(null);
  getQuizzes.mockReset().mockResolvedValue({ quizzes: [], page: 1, pages: 0 });
});

function renderHome() {
  render(<MemoryRouter><AuthProvider><Home /></AuthProvider></MemoryRouter>);
  return userEvent.setup();
}

describe('home quiz data', () => {
  it('renders the signed-in member, saved result, and published quiz links from services', async () => {
    getRecentQuiz.mockResolvedValue(attempt);
    getQuizzes.mockResolvedValue({ quizzes: [quiz], page: 1, pages: 1 });
    renderHome();
    expect(await screen.findByRole('heading', { name: 'Welcome back, Ada!' })).toBeVisible();
    expect(await screen.findByRole('link', { name: 'Review saved attempt' })).toHaveAttribute('href', '/attempts/attempt-1');
    expect(screen.getByText('1 / 2 correct (50%)')).toBeVisible();
    const catalogue = within(screen.getByRole('region', { name: 'Published Practice Quizzes' }));
    expect(await catalogue.findByRole('link', { name: 'Open quiz: World capitals' })).toHaveAttribute('href', '/quiz/quiz-1');
    expect(catalogue.getByText(/2 questions/)).toBeVisible();
  });

  it('shows honest empty states rather than placeholder results', async () => {
    renderHome();
    expect(await screen.findByText("You haven't taken any quizzes yet!")).toBeVisible();
    expect(await screen.findByText(/No published quizzes on this page/)).toBeVisible();
    expect(screen.getByRole('link', { name: 'Create a practice quiz' })).toHaveAttribute('href', '/make-quiz');
    expect(screen.queryByRole('link', { name: 'Review saved attempt' })).not.toBeInTheDocument();
  });

  it('recovers recent-attempt and catalogue failures independently', async () => {
    getRecentQuiz.mockRejectedValueOnce(new Error('Offline'));
    getQuizzes.mockRejectedValueOnce(new Error('Offline'));
    const user = renderHome();
    expect(await screen.findAllByRole('alert')).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'Retry recent attempt' }));
    expect(await screen.findByText("You haven't taken any quizzes yet!")).toBeVisible();
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(getQuizzes).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Retry quizzes' }));
    expect(await screen.findByText(/No published quizzes on this page/)).toBeVisible();
    expect(getRecentQuiz).toHaveBeenCalledTimes(2);
    expect(getQuizzes).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('requests the next catalogue page without refetching the recent attempt', async () => {
    getQuizzes.mockResolvedValueOnce({ quizzes: [quiz], page: 1, pages: 2 })
      .mockResolvedValueOnce({ quizzes: [{ ...quiz, _id: 'quiz-2', title: 'Rivers' }], page: 2, pages: 2 });
    const user = renderHome();
    const pages = within(await screen.findByRole('navigation', { name: 'Quiz catalogue pages' }));
    expect(pages.getByRole('button', { name: 'Previous' })).toBeDisabled();
    await user.click(pages.getByRole('button', { name: 'Next' }));
    expect(await screen.findByRole('link', { name: 'Open quiz: Rivers' })).toHaveAttribute('href', '/quiz/quiz-2');
    expect(screen.queryByRole('link', { name: 'Open quiz: World capitals' })).not.toBeInTheDocument();
    expect(getQuizzes).toHaveBeenLastCalledWith(2, expect.any(AbortSignal));
    expect(getRecentQuiz).toHaveBeenCalledTimes(1);
    expect(within(screen.getByRole('navigation', { name: 'Quiz catalogue pages' })).getByRole('button', { name: 'Next' })).toBeDisabled();
  });
});
