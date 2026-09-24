import { expect, it, vi } from 'vitest';
import { createQuiz } from './quizService';

const { adapter } = vi.hoisted(() => ({ adapter: vi.fn() }));
vi.mock('axios', async (original) => {
  const actual = (await original()).default;
  return { default: { ...actual, create: (options) => actual.create({ ...options, adapter }) } };
});

it('sends the caller publication key on both the initial request and its retry', async () => {
  adapter.mockImplementation(async (config) => ({ config, status: 201, headers: {}, data: { _id: 'saved-quiz' } }));
  const key = '9eafbc82-c40c-4944-8a4f-135b309e4dc9';
  const quiz = { title: 'Test quiz' };
  for (let attempt = 0; attempt < 2; attempt += 1) {
    expect(await createQuiz(quiz, key)).toEqual({ _id: 'saved-quiz' });
  }
  expect(adapter).toHaveBeenCalledTimes(2);
  for (const [config] of adapter.mock.calls) {
    expect(config.headers.get('Idempotency-Key')).toBe(key);
    expect(JSON.parse(config.data)).toEqual(quiz);
  }
});
