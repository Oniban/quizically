import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getLeaderboard } from '../services/quizService';
import Leaderboard from './Leaderboard';

vi.mock('../services/quizService', async (importOriginal) => ({
  ...await importOriginal(), getLeaderboard: vi.fn(),
}));

const rankings = {
  genres: ['Geography', 'History'],
  entries: [{ userId: 'member-2', rank: 1, name: 'Grace', correct: 7, total: 10, quizzes: 2, accuracy: 70 }],
};

beforeEach(() => getLeaderboard.mockReset().mockResolvedValue(rankings));

describe('leaderboard', () => {
  it('renders server rankings and requests selected genres and all genres', async () => {
    getLeaderboard.mockResolvedValueOnce(rankings).mockResolvedValueOnce({
      genres: rankings.genres,
      entries: [{ userId: 'member-3', rank: 1, name: 'Lin', correct: 3, total: 4, quizzes: 1, accuracy: 75 }],
    });
    const user = userEvent.setup();
    render(<MemoryRouter><Leaderboard /></MemoryRouter>);
    const all = within(await screen.findByRole('table', { name: 'All genres rankings' }));
    expect(all.getByRole('rowheader', { name: 'Grace' })).toBeVisible();
    expect(all.getAllByRole('cell').map((cell) => cell.textContent)).toEqual(['1', '7', '10', '2', '70%']);
    await user.selectOptions(screen.getByLabelText('Filter by genre'), 'Geography');
    const filtered = within(await screen.findByRole('table', { name: 'Geography rankings' }));
    expect(filtered.getByRole('rowheader', { name: 'Lin' })).toBeVisible();
    expect(filtered.getByRole('cell', { name: '75%' })).toBeVisible();
    expect(screen.queryByRole('rowheader', { name: 'Grace' })).not.toBeInTheDocument();
    expect(getLeaderboard).toHaveBeenLastCalledWith('Geography', expect.any(AbortSignal));
    await user.selectOptions(screen.getByLabelText('Filter by genre'), '');
    expect(await screen.findByRole('table', { name: 'All genres rankings' })).toBeVisible();
    expect(getLeaderboard).toHaveBeenLastCalledWith('', expect.any(AbortSignal));
  });

  it('shows an honest empty state when nobody has eligible attempts', async () => {
    getLeaderboard.mockResolvedValue({ genres: [], entries: [] });
    render(<MemoryRouter><Leaderboard /></MemoryRouter>);
    expect(await screen.findByText(/No eligible attempts yet/)).toBeVisible();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('preserves the genre on failure, retries that filter, and explains an empty filtered result', async () => {
    getLeaderboard.mockResolvedValueOnce(rankings).mockRejectedValueOnce(new Error('Offline'))
      .mockResolvedValueOnce({ genres: [], entries: [] });
    const user = userEvent.setup();
    render(<MemoryRouter><Leaderboard /></MemoryRouter>);
    await screen.findByRole('table');
    await user.selectOptions(screen.getByLabelText('Filter by genre'), 'History');
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to reach the quiz service.');
    expect(screen.getByLabelText('Filter by genre')).toHaveValue('History');
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText(/No eligible attempts for History/)).toBeVisible();
    expect(screen.getByLabelText('Filter by genre')).toHaveValue('History');
    expect(getLeaderboard).toHaveBeenLastCalledWith('History', expect.any(AbortSignal));
    expect(getLeaderboard).toHaveBeenCalledTimes(3);
  });
});
