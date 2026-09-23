import React from 'react';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MakeQuiz from './MakeQuiz';
import { createQuiz } from '../services/quizService';

vi.mock('../services/quizService', async (importOriginal) => ({
  ...await importOriginal(),
  createQuiz: vi.fn(),
}));

beforeEach(() => createQuiz.mockReset().mockResolvedValue({ _id: 'published-quiz' }));

function renderEditor() {
  render(<MemoryRouter initialEntries={['/make-quiz']}><Routes>
    <Route path="/make-quiz" element={<MakeQuiz />} />
    <Route path="/quiz/:id" element={<h1>Published quiz</h1>} />
  </Routes></MemoryRouter>);
  return userEvent.setup();
}

async function fillDetails(user) {
  await user.type(screen.getByLabelText('Quiz title'), '  Capital cities  ');
  await user.type(screen.getByLabelText('Genre'), '  Geography  ');
  await user.type(screen.getByLabelText('Question text'), '  Capital of France?  ');
}

async function fillMcq(user) {
  await fillDetails(user);
  await user.type(screen.getByLabelText('Option 1'), '  Paris  ');
  await user.type(screen.getByLabelText('Option 2'), '  Rome  ');
  await user.selectOptions(screen.getByLabelText('Correct answer'), screen.getByRole('option', { name: /Option 1:/ }));
}

describe('quiz creation', () => {
  it('requires fields before calling the service', async () => {
    const user = renderEditor();
    await user.click(screen.getByRole('button', { name: 'Publish practice quiz' }));
    expect(screen.getByLabelText('Quiz title')).toBeInvalid();
    expect(createQuiz).not.toHaveBeenCalled();
  });

  it('rejects whitespace-only metadata and question text', async () => {
    const user = renderEditor();
    await fillMcq(user);
    await user.clear(screen.getByLabelText('Quiz title'));
    await user.type(screen.getByLabelText('Quiz title'), '   ');
    await user.click(screen.getByRole('button', { name: 'Publish practice quiz' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a title and genre that are not just spaces.');
    await user.type(screen.getByLabelText('Quiz title'), 'Cities');
    await user.clear(screen.getByLabelText('Question text'));
    await user.type(screen.getByLabelText('Question text'), '   ');
    await user.click(screen.getByRole('button', { name: 'Publish practice quiz' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Question 1: enter the question, all options, and a correct answer.');
    expect(createQuiz).not.toHaveBeenCalled();
  });

  it('rejects duplicate options after case and whitespace normalization', async () => {
    const user = renderEditor();
    await fillMcq(user);
    await user.clear(screen.getByLabelText('Option 1'));
    await user.type(screen.getByLabelText('Option 1'), 'New York');
    await user.clear(screen.getByLabelText('Option 2'));
    await user.type(screen.getByLabelText('Option 2'), '  new   YORK  ');
    await user.click(screen.getByRole('button', { name: 'Publish practice quiz' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Question 1: options must be unique.');
    expect(createQuiz).not.toHaveBeenCalled();
  });

  it('publishes a trimmed MCQ payload with answer text, not editor IDs', async () => {
    const user = renderEditor();
    await fillMcq(user);
    await user.selectOptions(screen.getByLabelText('Difficulty'), 'Hard');
    await user.type(screen.getByLabelText('Explanation (optional)'), '  The French capital.  ');
    await user.click(screen.getByRole('button', { name: 'Publish practice quiz' }));
    expect(await screen.findByRole('heading', { name: 'Published quiz' })).toBeVisible();
    expect(createQuiz).toHaveBeenCalledExactlyOnceWith({
      title: 'Capital cities', genre: 'Geography', difficulty: 'Hard', format: 'MCQ',
      questions: [{ questionText: 'Capital of France?', options: ['Paris', 'Rome'], correctAnswer: 'Paris', explanation: 'The French capital.' }],
    });
  });

  it.each([
    ['True-False', 'False', ['True', 'False']],
    ['Short Answer', 'Paris', []],
  ])('publishes the %s format without stale MCQ options', async (format, answer, options) => {
    const user = renderEditor();
    await fillMcq(user);
    await user.selectOptions(screen.getByLabelText('Answer format'), format);
    expect(screen.getByLabelText('Correct answer')).toHaveValue('');
    expect(screen.queryByLabelText('Option 1')).not.toBeInTheDocument();
    if (format === 'Short Answer') await user.type(screen.getByLabelText('Correct answer'), `  ${answer}  `);
    else await user.selectOptions(screen.getByLabelText('Correct answer'), answer);
    await user.click(screen.getByRole('button', { name: 'Publish practice quiz' }));
    expect(await screen.findByRole('heading', { name: 'Published quiz' })).toBeVisible();
    expect(createQuiz).toHaveBeenCalledExactlyOnceWith({
      title: 'Capital cities', genre: 'Geography', difficulty: 'Medium', format,
      questions: [{ questionText: 'Capital of France?', options, correctAnswer: answer, explanation: '' }],
    });
  });

  it('maintains option bounds and clears an answer when its option is removed', async () => {
    const user = renderEditor();
    expect(screen.getByRole('button', { name: 'Remove option 1 from question 1' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Remove question 1' })).toBeDisabled();
    for (let count = 0; count < 4; count++) await user.click(screen.getByRole('button', { name: 'Add option' }));
    expect(screen.getByRole('button', { name: 'Add option' })).toBeDisabled();
    await user.type(screen.getByLabelText('Option 6'), 'Madrid');
    await user.selectOptions(screen.getByLabelText('Correct answer'), screen.getByRole('option', { name: 'Option 6: Madrid' }));
    await user.click(screen.getByRole('button', { name: 'Remove option 6 from question 1' }));
    expect(screen.getByLabelText('Correct answer')).toHaveValue('');
    await user.click(screen.getByRole('button', { name: 'Add question (1/30)' }));
    await user.type(within(screen.getByRole('group', { name: 'Question 2' })).getByLabelText('Question text'), 'Keep this question');
    await user.click(screen.getByRole('button', { name: 'Remove question 1' }));
    expect(screen.getByLabelText('Question text')).toHaveValue('Keep this question');
  });

  it('preserves the draft after an API error and retries the same payload', async () => {
    createQuiz.mockRejectedValueOnce({ response: { data: { message: 'Publishing is temporarily unavailable.' } } });
    const user = renderEditor();
    await fillMcq(user);
    await user.click(screen.getByRole('button', { name: 'Publish practice quiz' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Publishing is temporarily unavailable.');
    expect(screen.getByLabelText('Quiz title')).toHaveValue('  Capital cities  ');
    expect(screen.getByLabelText('Option 1')).toHaveValue('  Paris  ');
    await user.click(screen.getByRole('button', { name: 'Publish practice quiz' }));
    expect(await screen.findByRole('heading', { name: 'Published quiz' })).toBeVisible();
    expect(createQuiz).toHaveBeenCalledTimes(2);
    expect(createQuiz.mock.calls[1]).toEqual(createQuiz.mock.calls[0]);
  });

  it('disables editing and duplicate publishing until the request finishes', async () => {
    let finishPublishing;
    createQuiz.mockReturnValueOnce(new Promise((resolve) => { finishPublishing = resolve; }));
    const user = renderEditor();
    await fillMcq(user);
    await user.dblClick(screen.getByRole('button', { name: 'Publish practice quiz' }));
    expect(screen.getByRole('button', { name: 'Publishing...' })).toBeDisabled();
    expect(screen.getByLabelText('Quiz title')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Add question (1/30)' })).toBeDisabled();
    expect(createQuiz).toHaveBeenCalledTimes(1);
    await act(async () => { finishPublishing({ _id: 'published-quiz' }); });
    expect(await screen.findByRole('heading', { name: 'Published quiz' })).toBeVisible();
  });
});
