import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { calculateStreak, normalizeAnswer, scoreQuiz, validateQuiz } from '../services/quizRules.js';

function validQuiz(overrides = {}) {
  return {
    title: 'Planets', genre: 'Science', difficulty: 'Easy', format: 'MCQ',
    questions: [{ questionText: 'The red planet?', options: ['Mars', 'Venus'], correctAnswer: 'Mars', explanation: 'Iron oxide.' }],
    ...overrides,
  };
}

const invalid = (action) => assert.throws(action, (error) => error instanceof Error && error.status === 422);

describe('validateQuiz', () => {
  it('trims text, propagates quiz metadata, strips untrusted fields, and leaves input unchanged', () => {
    const input = validQuiz({ title: ' Planets ', genre: ' Science ', createdBy: 'spoofed', score: 100 });
    input.questions = [{ questionText: ' The red planet? ', options: [' Mars ', ' Venus '], correctAnswer: ' Mars ', genre: 'Spoofed', difficulty: 'Hard', format: 'Short Answer', isCorrect: true }];
    const original = structuredClone(input);
    assert.deepEqual(validateQuiz(input), {
      title: 'Planets', genre: 'Science', difficulty: 'Easy', format: 'MCQ',
      questions: [{ questionText: 'The red planet?', options: ['Mars', 'Venus'], correctAnswer: 'Mars', explanation: '', genre: 'Science', difficulty: 'Easy', format: 'MCQ' }],
    });
    assert.deepEqual(input, original);
  });

  it('supplies canonical True-False options and removes options from Short Answer questions', () => {
    const tf = validateQuiz(validQuiz({ format: 'True-False', questions: [{ questionText: 'A fact?', correctAnswer: 'False', options: ['fake'] }] }));
    assert.deepEqual(tf.questions[0].options, ['True', 'False']);
    const short = validateQuiz(validQuiz({ format: 'Short Answer' }));
    assert.deepEqual(short.questions[0].options, []);
  });

  it('accepts documented maximum text, question, and option lengths', () => {
    const question = { questionText: 'q'.repeat(2000), correctAnswer: 'a'.repeat(500), explanation: 'e'.repeat(2000), options: ['a'.repeat(500), 'b', 'c', 'd', 'e', 'f'] };
    const result = validateQuiz(validQuiz({ title: 't'.repeat(120), genre: 'g'.repeat(60), questions: Array.from({ length: 30 }, () => question) }));
    assert.equal(result.questions.length, 30);
    assert.equal(result.questions[0].options.length, 6);
  });

  for (const [name, body] of [
    ['missing body', undefined], ['null body', null], ['primitive body', 'quiz'],
    ['blank title', validQuiz({ title: ' ' })], ['long title', validQuiz({ title: 't'.repeat(121) })],
    ['non-string title', validQuiz({ title: 1 })], ['blank genre', validQuiz({ genre: '' })],
    ['long genre', validQuiz({ genre: 'g'.repeat(61) })], ['unknown difficulty', validQuiz({ difficulty: 'easy' })],
    ['unknown format', validQuiz({ format: 'Multiple Choice' })], ['missing questions', validQuiz({ questions: undefined })],
    ['non-array questions', validQuiz({ questions: {} })], ['empty questions', validQuiz({ questions: [] })],
    ['too many questions', validQuiz({ questions: Array(31).fill(validQuiz().questions[0]) })],
    ['null question', validQuiz({ questions: [null] })], ['primitive question', validQuiz({ questions: [42] })],
  ]) it(`rejects ${name}`, () => invalid(() => validateQuiz(body)));

  for (const [name, changes] of [
    ['blank question text', { questionText: ' ' }], ['long question text', { questionText: 'q'.repeat(2001) }],
    ['non-string question text', { questionText: {} }], ['missing answer', { correctAnswer: undefined }],
    ['blank answer', { correctAnswer: '' }], ['long answer', { correctAnswer: 'a'.repeat(501) }],
    ['non-string answer', { correctAnswer: true }], ['null explanation', { explanation: null }],
    ['long explanation', { explanation: 'e'.repeat(2001) }], ['non-array options', { options: {} }],
    ['one option', { options: ['Mars'] }], ['seven options', { options: ['Mars', 'a', 'b', 'c', 'd', 'e', 'f'] }],
    ['blank option', { options: ['Mars', ' '] }], ['non-string option', { options: ['Mars', 42] }],
    ['long option', { options: ['Mars', 'a'.repeat(501)] }], ['duplicate options', { options: ['Mars', ' MARS '] }],
    ['Unicode-equivalent options', { options: ['Mars', '\uFF2D\uFF41\uFF52\uFF53'] }],
    ['answer not in options', { correctAnswer: 'Earth' }], ['noncanonical answer option', { correctAnswer: 'mars' }],
  ]) it(`rejects ${name}`, () => invalid(() => validateQuiz(validQuiz({ questions: [{ ...validQuiz().questions[0], ...changes }] }))));

  it('rejects True-False answers other than the canonical options', () => {
    invalid(() => validateQuiz(validQuiz({ format: 'True-False', questions: [{ questionText: 'A fact?', correctAnswer: 'true' }] })));
  });
});

describe('scoreQuiz', () => {
  const quiz = {
    title: 'Mixed quiz', genre: 'Science', difficulty: 'Easy', format: 'MCQ',
    questions: [
      { _id: 'q1', questionText: 'Red planet?', correctAnswer: 'Mars', options: ['Mars', 'Venus'], explanation: 'Iron oxide.' },
      { _id: 'q2', questionText: 'The Big Apple?', correctAnswer: 'New York', options: [], genre: 'Geography', difficulty: 'Hard', format: 'Short Answer' },
      { _id: 'q3', questionText: 'The Sun is a planet.', correctAnswer: 'False', options: ['True', 'False'], format: 'True-False' },
    ],
  };

  it('matches IDs, not order, normalizes short answers, snapshots feedback, and rounds accuracy', () => {
    const submitted = [{ questionId: 'q2', answer: '  \uFF2E\uFF45\uFF57\t YORK  ' }, { questionId: 'q1', answer: 'Mars' }];
    const original = structuredClone(quiz);
    const result = scoreQuiz(quiz, submitted);
    assert.deepEqual(result, {
      score: 2, total: 3, accuracy: 67,
      answers: [
        { questionId: 'q1', questionText: 'Red planet?', answer: 'Mars', correctAnswer: 'Mars', explanation: 'Iron oxide.', isCorrect: true, genre: 'Science', difficulty: 'Easy', format: 'MCQ' },
        { questionId: 'q2', questionText: 'The Big Apple?', answer: '\uFF2E\uFF45\uFF57\t YORK', correctAnswer: 'New York', explanation: '', isCorrect: true, genre: 'Geography', difficulty: 'Hard', format: 'Short Answer' },
        { questionId: 'q3', questionText: 'The Sun is a planet.', answer: '', correctAnswer: 'False', explanation: '', isCorrect: false, genre: 'Science', difficulty: 'Easy', format: 'True-False' },
      ],
    });
    assert.deepEqual(quiz, original);
  });

  it('marks wrong listed options incorrect and ignores client scoring fields', () => {
    const result = scoreQuiz(quiz, [{ questionId: 'q1', answer: 'Venus', isCorrect: true, correctAnswer: 'Venus', score: 100 }]);
    assert.equal(result.score, 0);
    assert.equal(result.accuracy, 0);
    assert.equal(result.answers[0].correctAnswer, 'Mars');
    assert.equal(result.answers[0].isCorrect, false);
  });

  it('scores missing, empty, whitespace-only, and omitted answer values as skipped', () => {
    for (const submitted of [[], [{ questionId: 'q1' }], [{ questionId: 'q1', answer: '' }], [{ questionId: 'q1', answer: ' \n\t ' }]]) {
      const result = scoreQuiz(quiz, submitted);
      assert.equal(result.score, 0);
      assert.equal(result.total, 3);
      assert.equal(result.accuracy, 0);
      assert.ok(result.answers.every((answer) => answer.answer === '' && !answer.isCorrect));
    }
  });

  it('returns finite zero accuracy for an empty quiz', () => {
    assert.deepEqual(scoreQuiz({ ...quiz, questions: [] }, []), { answers: [], score: 0, total: 0, accuracy: 0 });
  });

  for (const [name, answers] of [
    ['missing list', undefined], ['null list', null], ['object list', {}],
    ['too many answers', Array(4).fill({ questionId: 'q1', answer: 'Mars' })],
    ['unknown question', [{ questionId: 'other', answer: 'Mars' }]],
    ['duplicate question', [{ questionId: 'q1', answer: 'Mars' }, { questionId: 'q1', answer: 'Venus' }]],
    ['null entry', [null]], ['missing question ID', [{ answer: 'Mars' }]],
    ['non-string question ID', [{ questionId: 1, answer: 'Mars' }]],
    ['null answer', [{ questionId: 'q1', answer: null }]], ['numeric answer', [{ questionId: 'q1', answer: 1 }]],
    ['object answer', [{ questionId: 'q1', answer: {} }]], ['array answer', [{ questionId: 'q1', answer: ['Mars'] }]],
    ['overlong answer', [{ questionId: 'q2', answer: 'a'.repeat(501) }]],
    ['unlisted MCQ option', [{ questionId: 'q1', answer: 'Earth' }]],
    ['noncanonical MCQ option', [{ questionId: 'q1', answer: 'mars' }]],
    ['unlisted True-False option', [{ questionId: 'q3', answer: 'no' }]],
  ]) it(`rejects ${name}`, () => invalid(() => scoreQuiz(quiz, answers)));

  it('normalizes Unicode, repeated whitespace, case, and surrounding whitespace without fuzzy matching', () => {
    assert.equal(normalizeAnswer('  \uFF2E\uFF45\uFF57\u00a0 \tYORK\n'), 'new york');
    assert.equal(normalizeAnswer('Cafe\u0301'), normalizeAnswer('Caf\u00e9'));
    assert.notEqual(normalizeAnswer('New-York'), normalizeAnswer('New York'));
    assert.notEqual(normalizeAnswer('Paris!'), normalizeAnswer('Paris'));
  });
});

describe('calculateStreak (UTC calendar dates from activity aggregation)', () => {
  for (const [name, days, now, expected] of [
    ['no activity', [], '2026-09-23T12:00:00Z', 0],
    ['today only', ['2026-09-23'], '2026-09-23T12:00:00Z', 1],
    ['yesterday is still active', ['2026-09-22', '2026-09-21'], '2026-09-23T23:59:59Z', 2],
    ['a missed full day resets the streak', ['2026-09-21', '2026-09-20'], '2026-09-23T00:00:00Z', 0],
    ['stops at a gap', ['2026-09-23', '2026-09-22', '2026-09-20'], '2026-09-23T12:00:00Z', 2],
    ['same-day activity counts once', ['2026-09-23', '2026-09-22', '2026-09-23', '2026-09-22'], '2026-09-23T12:00:00Z', 2],
    ['sorts unordered dates', ['2026-09-21', '2026-09-23', '2026-09-22'], '2026-09-23T12:00:00Z', 3],
    ['ignores future activity', ['2026-09-24', '2026-09-23', '2026-09-22'], '2026-09-23T12:00:00Z', 2],
    ['future-only activity earns no streak', ['2026-09-24'], '2026-09-23T12:00:00Z', 0],
    ['just before UTC midnight', ['2026-09-22'], '2026-09-23T23:59:59.999Z', 1],
    ['resets exactly at UTC midnight', ['2026-09-22'], '2026-09-24T00:00:00.000Z', 0],
    ['uses UTC rather than a positive local offset', ['2026-09-21'], '2026-09-23T00:30:00+02:00', 1],
    ['uses UTC rather than a negative local offset', ['2026-09-21'], '2026-09-22T23:30:00-02:00', 0],
    ['crosses a year boundary', ['2027-01-01', '2026-12-31', '2026-12-30'], '2027-01-01T12:00:00Z', 3],
    ['crosses leap day', ['2024-03-01', '2024-02-29', '2024-02-28'], '2024-03-01T12:00:00Z', 3],
    ['does not use local daylight-saving day lengths', ['2026-03-09', '2026-03-08', '2026-03-07'], '2026-03-09T12:00:00Z', 3],
  ]) it(name, () => assert.equal(calculateStreak(days, new Date(now)), expected));

  it('does not reorder or mutate caller-owned dates', () => {
    const days = ['2026-09-21', '2026-09-23', '2026-09-22'];
    calculateStreak(days, new Date('2026-09-23T12:00:00Z'));
    assert.deepEqual(days, ['2026-09-21', '2026-09-23', '2026-09-22']);
  });
});
