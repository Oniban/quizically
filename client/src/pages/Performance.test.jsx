import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getPerformance } from '../services/quizService';
import Performance from './Performance';

vi.mock('../services/quizService', async (importOriginal) => ({
  ...await importOriginal(), getPerformance: vi.fn(),
}));

beforeEach(() => getPerformance.mockReset().mockResolvedValue({ totalQuizzes: 0 }));

describe('performance', () => {
  it('renders server totals and accessible genre, difficulty, and format breakdowns', async () => {
    getPerformance.mockResolvedValue({
      totalQuizzes: 3, totalQuestions: 8, correctAnswers: 6, accuracy: 75,
      byGenre: [{ name: 'Geography', correct: 6, total: 8, accuracy: 75 }],
      byDifficulty: [{ name: 'Hard', correct: 6, total: 8, accuracy: 75 }],
      byFormat: [{ name: 'MCQ', correct: 6, total: 8, accuracy: 75 }],
    });
    render(<MemoryRouter><Performance /></MemoryRouter>);
    await screen.findByRole('region', { name: 'By genre' });
    expect(screen.getAllByRole('definition').map((item) => item.textContent)).toEqual(['3', '8', '6', '75%']);
    for (const [category, name] of [['genre', 'Geography'], ['difficulty', 'Hard'], ['format', 'MCQ']]) {
      const table = within(screen.getByRole('table', { name: `Performance by ${category}` }));
      expect(table.getByRole('rowheader', { name })).toBeVisible();
      expect(table.getAllByRole('cell').map((cell) => cell.textContent)).toEqual(['6', '8', '75%']);
    }
  });

  it('invites a member with no attempts to find a quiz instead of showing invented stats', async () => {
    render(<MemoryRouter><Performance /></MemoryRouter>);
    expect(await screen.findByText(/No saved attempts yet/)).toBeVisible();
    expect(screen.getByRole('link', { name: 'Find a quiz to get started' })).toHaveAttribute('href', '/');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByRole('definition')).not.toBeInTheDocument();
  });

  it('shows service errors and allows a retry', async () => {
    getPerformance.mockRejectedValueOnce({ response: { data: { message: 'Statistics temporarily unavailable.' } } });
    const user = userEvent.setup();
    render(<MemoryRouter><Performance /></MemoryRouter>);
    expect(await screen.findByRole('alert')).toHaveTextContent('Statistics temporarily unavailable.');
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText(/No saved attempts yet/)).toBeVisible();
    expect(getPerformance).toHaveBeenCalledTimes(2);
  });
});
