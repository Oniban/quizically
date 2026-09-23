import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAttempts } from '../services/quizService';
import { attempt } from '../test/fixtures';
import PastSets from './PastSets';

vi.mock('../services/quizService', async (importOriginal) => ({
  ...await importOriginal(), getAttempts: vi.fn(),
}));

beforeEach(() => getAttempts.mockReset().mockResolvedValue({ attempts: [], page: 1, pages: 0 }));

describe('past attempts', () => {
  it('renders persisted scores and review links, then loads another page', async () => {
    getAttempts.mockResolvedValueOnce({ attempts: [attempt], page: 1, pages: 2 })
      .mockResolvedValueOnce({ attempts: [{ ...attempt, _id: 'attempt-2', title: 'Rivers' }], page: 2, pages: 2 });
    const user = userEvent.setup();
    render(<MemoryRouter><PastSets /></MemoryRouter>);
    const table = within(await screen.findByRole('table', { name: 'Saved attempts, most recent first' }));
    expect(table.getByRole('cell', { name: '1 / 2' })).toBeVisible();
    expect(table.getByRole('cell', { name: '50%' })).toBeVisible();
    expect(table.getByRole('link', { name: 'Review World capitals' })).toHaveAttribute('href', '/attempts/attempt-1');
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByRole('link', { name: 'Review Rivers' })).toHaveAttribute('href', '/attempts/attempt-2');
    expect(getAttempts).toHaveBeenLastCalledWith(2, expect.any(AbortSignal));
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    expect(screen.queryByRole('link', { name: 'Review World capitals' })).not.toBeInTheDocument();
  });

  it('shows an empty history with a browse link', async () => {
    render(<MemoryRouter><PastSets /></MemoryRouter>);
    expect(await screen.findByText(/No saved attempts on this page/)).toBeVisible();
    expect(screen.getByRole('link', { name: 'Browse practice quizzes' })).toHaveAttribute('href', '/');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('reports a service failure instead of an empty history and retries', async () => {
    getAttempts.mockRejectedValueOnce(new Error('Offline'));
    const user = userEvent.setup();
    render(<MemoryRouter><PastSets /></MemoryRouter>);
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to reach the quiz service.');
    expect(screen.queryByText(/No saved attempts on this page/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText(/No saved attempts on this page/)).toBeVisible();
    expect(getAttempts).toHaveBeenCalledTimes(2);
  });
});
