import React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../context/AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';
import { getMe } from '../services/authService';
import { getAttempt, getQuiz, submitQuiz } from '../services/quizService';
import { attempt, member, quiz } from '../test/fixtures';
import QuizPlay from './QuizPlay';

vi.mock('../services/authService', () => ({ getMe: vi.fn(), logoutUser: vi.fn() }));
vi.mock('../services/quizService', async (importOriginal) => ({
  ...await importOriginal(), getAttempt: vi.fn(), getQuiz: vi.fn(), submitQuiz: vi.fn(),
}));

beforeEach(() => {
  getMe.mockReset().mockResolvedValue({ user: member });
  getQuiz.mockReset().mockResolvedValue(quiz);
  getAttempt.mockReset().mockResolvedValue(attempt);
  submitQuiz.mockReset().mockResolvedValue(attempt);
});

function renderQuiz(path = '/quiz/quiz-1') {
  render(<MemoryRouter initialEntries={[path]}><AuthProvider><Routes>
    <Route element={<ProtectedRoute />}>
      <Route path="/quiz/:id" element={<QuizPlay />} />
      <Route path="/attempts/:attemptId" element={<QuizPlay />} />
    </Route>
    <Route path="/login" element={<h1>Sign in</h1>} />
  </Routes></AuthProvider></MemoryRouter>);
  return userEvent.setup();
}

describe('taking and reviewing quizzes', () => {
  it('keeps answer keys hidden until submission and renders the server result', async () => {
    // Even an over-inclusive quiz response must not disclose review fields early.
    getQuiz.mockResolvedValue({ ...quiz, questions: quiz.questions.map((question, index) => ({
      ...question, correctAnswer: attempt.answers[index].correctAnswer, explanation: attempt.answers[index].explanation,
    })) });
    const user = renderQuiz();
    expect(await screen.findByRole('heading', { name: quiz.title })).toBeVisible();
    expect(screen.queryByText('Correct answer:')).not.toBeInTheDocument();
    expect(screen.queryByText(attempt.answers[0].explanation)).not.toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: '1. Paris' }));
    await user.click(screen.getByRole('button', { name: 'Submit answers' }));
    const heading = await screen.findByRole('heading', { name: 'World capitals: Saved Attempt' });
    expect(heading).toHaveFocus();
    expect(submitQuiz).toHaveBeenCalledExactlyOnceWith('quiz-1', [
      { questionId: 'question-1', answer: 'Paris' }, { questionId: 'question-2', answer: '' },
    ]);
    expect(screen.getByRole('region', { name: 'Saved result' })).toHaveTextContent('1 / 2 correct (50%)');
    expect(screen.getByText(attempt.answers[0].explanation, { exact: false })).toBeVisible();
    const skipped = screen.getAllByRole('article')[1];
    expect(skipped).toHaveTextContent('Your answer: Skipped');
    expect(skipped).toHaveTextContent('Correct answer: Tokyo');
    expect(skipped).toHaveTextContent('Explanation: No explanation provided.');
    expect(screen.getByRole('link', { name: 'Permanent review link' })).toHaveAttribute('href', '/attempts/attempt-1');
    expect(getMe).toHaveBeenCalledTimes(2);
  });

  it('preserves selected answers after submission failure and trusts the saved server result on retry', async () => {
    submitQuiz.mockRejectedValueOnce(new Error('Connection lost'));
    const user = renderQuiz();
    await user.click(await screen.findByRole('radio', { name: '2. Rome' }));
    await user.click(screen.getByRole('button', { name: 'Submit answers' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Your answers are preserved.');
    expect(screen.getByRole('radio', { name: '2. Rome' })).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Submit answers' }));
    expect(await screen.findByRole('region', { name: 'Saved result' })).toHaveTextContent('1 / 2 correct (50%)');
    expect(submitQuiz).toHaveBeenCalledTimes(2);
    expect(submitQuiz.mock.calls[1]).toEqual(submitQuiz.mock.calls[0]);
    // A prior saved result, not a client re-grade of the current Rome selection.
    expect(screen.getAllByRole('article')[0]).toHaveTextContent('Your answer: Paris');
  });

  it('submits short answer text unchanged and sends unanswered questions as skipped', async () => {
    getQuiz.mockResolvedValue({ ...quiz, format: 'Short Answer', questions: quiz.questions.map((question) => ({
      ...question, format: 'Short Answer', options: [],
    })) });
    const user = renderQuiz();
    await user.type((await screen.findAllByLabelText('Your answer (optional)'))[0], '  PARIS  ');
    await user.click(screen.getByRole('button', { name: 'Submit answers' }));
    await screen.findByRole('region', { name: 'Saved result' });
    expect(submitQuiz).toHaveBeenCalledExactlyOnceWith('quiz-1', [
      { questionId: 'question-1', answer: '  PARIS  ' }, { questionId: 'question-2', answer: '' },
    ]);
  });

  it('allows clearing a True-False answer before submitting it as skipped', async () => {
    getQuiz.mockResolvedValue({ ...quiz, format: 'True-False', questions: [
      { _id: 'question-1', questionText: 'Paris is in France.', format: 'True-False', options: ['True', 'False'] },
    ] });
    submitQuiz.mockResolvedValue({ ...attempt, format: 'True-False', score: 0, total: 1, accuracy: 0, answers: [
      { questionId: 'question-1', questionText: 'Paris is in France.', answer: '', correctAnswer: 'True', isCorrect: false, explanation: '' },
    ] });
    const user = renderQuiz();
    await user.click(await screen.findByRole('radio', { name: '2. False' }));
    expect(screen.getByRole('radio', { name: '2. False' })).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Clear answer for question 1' }));
    expect(screen.getByRole('radio', { name: '2. False' })).not.toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Submit answers' }));
    await screen.findByRole('region', { name: 'Saved result' });
    expect(submitQuiz).toHaveBeenCalledExactlyOnceWith('quiz-1', [{ questionId: 'question-1', answer: '' }]);
  });

  it('offers review instead of another submission for an already completed quiz', async () => {
    getQuiz.mockResolvedValue({ ...quiz, attemptId: 'attempt-1' });
    const user = renderQuiz();
    await user.click(await screen.findByRole('link', { name: 'Review your previous attempt' }));
    expect(await screen.findByRole('heading', { name: 'World capitals: Saved Attempt' })).toBeVisible();
    expect(getAttempt).toHaveBeenCalledWith('attempt-1', expect.any(AbortSignal));
    expect(screen.queryByRole('button', { name: 'Submit answers' })).not.toBeInTheDocument();
    expect(submitQuiz).not.toHaveBeenCalled();
  });

  it('loads a saved review directly without fetching or submitting the quiz', async () => {
    renderQuiz('/attempts/attempt-1');
    expect(await screen.findByRole('region', { name: 'Saved result' })).toHaveTextContent('50%');
    expect(getQuiz).not.toHaveBeenCalled();
    expect(submitQuiz).not.toHaveBeenCalled();
    expect(getMe).toHaveBeenCalledTimes(1);
  });

  it('keeps the saved review visible when account refresh fails', async () => {
    getMe.mockResolvedValueOnce({ user: member }).mockRejectedValueOnce(new Error('Offline'));
    const user = renderQuiz();
    await user.click(await screen.findByRole('button', { name: 'Submit answers' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Your attempt is saved, but account stats could not refresh.');
    expect(screen.getByRole('region', { name: 'Saved result' })).toHaveTextContent('1 / 2 correct (50%)');
    expect(screen.getByRole('link', { name: 'Permanent review link' })).toBeVisible();
    expect(submitQuiz).toHaveBeenCalledTimes(1);
  });

  it('prevents duplicate submissions and answer changes while saving', async () => {
    let finishSaving;
    submitQuiz.mockReturnValueOnce(new Promise((resolve) => { finishSaving = resolve; }));
    const user = renderQuiz();
    await user.click(await screen.findByRole('radio', { name: '1. Paris' }));
    await user.dblClick(screen.getByRole('button', { name: 'Submit answers' }));
    expect(screen.getByRole('button', { name: 'Saving attempt...' })).toBeDisabled();
    expect(screen.getByRole('radio', { name: '2. Rome' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Clear answer for question 1' })).toBeDisabled();
    expect(submitQuiz).toHaveBeenCalledTimes(1);
    await act(async () => { finishSaving(attempt); });
    expect(await screen.findByRole('region', { name: 'Saved result' })).toHaveTextContent('1 / 2 correct (50%)');
  });

  it.each(['/quiz/quiz-1', '/attempts/attempt-1'])('retries failed loading at %s', async (path) => {
    const service = path.startsWith('/quiz/') ? getQuiz : getAttempt;
    service.mockRejectedValueOnce({ response: { status: 401 } });
    const user = renderQuiz(path);
    expect(await screen.findByRole('alert')).toHaveTextContent('Your session has expired. Please sign in again.');
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('heading', { name: path.startsWith('/quiz/') ? quiz.title : 'World capitals: Saved Attempt' })).toBeVisible();
    expect(service).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
