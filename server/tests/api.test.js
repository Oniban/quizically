import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { after, before, beforeEach, describe, it } from 'node:test';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { OAuth2Client } from 'google-auth-library';

// Never import server.js: it loads .env and connects to the configured database.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'quizzically-tests-only-secret-not-for-production-123456789';
const { createApp } = await import('../app.js');

const password = 'TestPassword123!';
const unknownId = '000000000000000000000001';
let mongo;
let server;
let baseURL;
let nextUser = 0;

function quizBody(format = 'MCQ', overrides = {}) {
  const questions = {
    MCQ: [
      { questionText: 'Which planet is red?', options: ['Mars', 'Venus'], correctAnswer: 'Mars', explanation: 'Iron oxide gives Mars its color.' },
      { questionText: 'Which planet has prominent rings?', options: ['Earth', 'Saturn'], correctAnswer: 'Saturn', explanation: 'Saturn has prominent icy rings.' },
    ],
    'True-False': [
      { questionText: 'Water contains hydrogen.', correctAnswer: 'True', explanation: 'Water is H2O.' },
      { questionText: 'The Sun is a planet.', correctAnswer: 'False', explanation: 'The Sun is a star.' },
    ],
    'Short Answer': [
      { questionText: 'Which city is nicknamed the Big Apple?', correctAnswer: 'New York', explanation: 'This nickname refers to New York.' },
      { questionText: 'What is the capital of France?', correctAnswer: 'Paris', explanation: 'Paris is the French capital.' },
    ],
  };
  return { title: `${format} quiz`, genre: 'Science', difficulty: 'Easy', format, questions: questions[format], ...overrides };
}

async function request(path, { method = 'GET', cookie, body, status = 200, headers = {}, label = '', idempotencyKey = randomUUID() } = {}) {
  const response = await fetch(`${baseURL}${path}`, {
    method,
    headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(cookie ? { Cookie: cookie } : {}), ...(method === 'POST' && path === '/api/quizzes' && idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}), ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(15000),
  });
  const text = await response.text();
  assert.ok([status].flat().includes(response.status), `${label} ${method} ${path}: expected ${status}, got ${response.status}: ${text}`);
  const data = text ? JSON.parse(text) : null;
  if (status >= 400) assert.equal(typeof data.message, 'string');
  return { data, headers: response.headers };
}

async function register(name = 'Test Player') {
  const email = `player${++nextUser}@example.com`;
  const { data, headers } = await request('/api/auth/register', { method: 'POST', body: { name, email, password }, status: 201 });
  const setCookie = headers.get('set-cookie');
  assert.match(setCookie, /^token=.+; Max-Age=2592000;/);
  assert.match(setCookie, /; HttpOnly/);
  assert.match(setCookie, /; SameSite=Strict/);
  assert.match(setCookie, /; Path=\//);
  assert.equal(data.user.totalQuizzes, 0);
  assert.equal(data.user.streak, 0);
  assert.equal('password' in data.user, false);
  assert.equal('token' in data, false);
  return { user: data.user, cookie: setCookie.split(';')[0], setCookie, email };
}

async function createQuiz(cookie, body = quizBody()) {
  const { data } = await request('/api/quizzes', { method: 'POST', cookie, body, status: 201 });
  assert.match(data._id, /^[a-f\d]{24}$/);
  const { data: quiz } = await request(`/api/quizzes/${data._id}`, { cookie });
  return quiz;
}

function assertNoAnswerKey(value) {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    assert.ok(!['correctAnswer', 'explanation', 'isCorrect'].includes(key), `Leaked ${key}`);
    assertNoAnswerKey(child);
  }
}

const submit = (cookie, quiz, answers, extra = {}) => request(`/api/quizzes/${quiz._id}/submit`, {
  method: 'POST', cookie, body: { answers, ...extra },
});

describe('quiz API with an isolated MongoDB and real HTTP server', { concurrency: false }, () => {
  before(async () => {
    mongo = await MongoMemoryServer.create({ instance: { ip: '127.0.0.1', dbName: 'quizzically_tests' } });
    await mongoose.connect(mongo.getUri(), { serverSelectionTimeoutMS: 10000 });
    // Keep the real unique indexes: duplicate-submission safety depends on them.
    await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
  }, { timeout: 300000 });

  beforeEach(async () => {
    // Fresh app instances isolate rate-limit buckets as well as database state.
    if (server) {
      const closed = new Promise((resolve) => server.close(resolve));
      server.closeAllConnections();
      await closed;
    }
    await Promise.all(Object.values(mongoose.models).map((model) => model.deleteMany({})));
    server = createApp().listen(0, '127.0.0.1');
    await once(server, 'listening');
    baseURL = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    try {
      if (server) {
        const closed = new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
        server.closeAllConnections();
        await closed;
      }
    } finally {
      try { await mongoose.disconnect(); } finally { await mongo?.stop(); }
    }
  });

  it('registers, creates all formats, scores on the server, saves private reviews, and derives statistics', async () => {
    const author = await register('Quiz Author');
    const player = await register('Quiz Player');
    const outsider = await register('Other Player');
    assert.doesNotMatch(player.setCookie, /; Secure/);

    const definitions = [
      quizBody(),
      quizBody('True-False', { difficulty: 'Medium' }),
      quizBody('Short Answer', { genre: 'Geography', difficulty: 'Hard' }),
    ];
    const quizzes = [];
    for (const body of definitions) {
      const quiz = await createQuiz(author.cookie, body);
      assert.equal(quiz.attemptId, null);
      assert.equal(quiz.questions.length, 2);
      assertNoAnswerKey(quiz);
      const { data: playable } = await request(`/api/quizzes/${quiz._id}`, { cookie: player.cookie });
      assertNoAnswerKey(playable);
      assert.equal(playable.format, body.format);
      for (const question of playable.questions) assert.equal(question.format, body.format);
      quizzes.push(quiz);
    }
    assert.deepEqual(quizzes[1].questions[0].options, ['True', 'False']);
    assert.deepEqual(quizzes[2].questions[0].options, []);

    const { data: catalog, headers } = await request('/api/quizzes', { cookie: player.cookie });
    assert.equal(headers.get('cache-control'), 'no-store');
    assert.equal(catalog.quizzes.length, 3);
    assertNoAnswerKey(catalog);
    for (const quiz of catalog.quizzes) {
      assert.equal(quiz.questionCount, 2);
      assert.equal('questions' in quiz, false);
    }

    const submitted = [
      ['Mars', 'Earth'],
      ['True', 'False'],
      ['  \uFF2E\uFF45\uFF57\t  YORK  '],
    ];
    const attempts = [];
    for (const [index, quiz] of quizzes.entries()) {
      const answers = submitted[index].map((answer, i) => ({ questionId: quiz.questions[i]._id, answer, isCorrect: true }));
      const { data: attempt } = await submit(player.cookie, quiz, answers, {
        score: 999, total: 999, accuracy: 100, user: author.user._id, leaderboardEligible: false,
      });
      assert.equal(attempt.score, [1, 2, 1][index]);
      assert.equal(attempt.total, 2);
      assert.equal(attempt.accuracy, [50, 100, 50][index]);
      assert.equal(attempt.quizId, quiz._id);
      assert.equal(attempt.answers.length, 2);
      assert.ok(Number.isFinite(Date.parse(attempt.completedAt)));
      for (const [i, answer] of attempt.answers.entries()) {
        assert.equal(answer.correctAnswer, definitions[index].questions[i].correctAnswer);
        assert.equal(answer.explanation, definitions[index].questions[i].explanation);
      }
      for (const key of ['user', 'leaderboardEligible', '__v']) assert.equal(key in attempt, false);
      const { data: saved } = await request(`/api/quizzes/attempts/${attempt._id}`, { cookie: player.cookie });
      assert.deepEqual(saved, attempt);
      const { data: replay } = await request(`/api/quizzes/${quiz._id}`, { cookie: player.cookie });
      assert.equal(replay.attemptId, attempt._id);
      assertNoAnswerKey(replay);
      await request(`/api/quizzes/attempts/${attempt._id}`, { cookie: outsider.cookie, status: 404 });
      await request(`/api/quizzes/attempts/${attempt._id}`, { cookie: author.cookie, status: 404 });
      attempts.push(attempt);
    }
    assert.equal(attempts[2].answers[1].answer, '');
    assert.equal(attempts[2].answers[1].isCorrect, false);

    const { data: history } = await request('/api/quizzes/attempts', { cookie: player.cookie });
    assert.deepEqual(history.attempts.map((attempt) => attempt._id), attempts.map((attempt) => attempt._id).reverse());
    assertNoAnswerKey(history);
    for (const attempt of history.attempts) assert.equal('answers' in attempt, false);
    const { data: recent } = await request('/api/quizzes/recent', { cookie: player.cookie });
    assert.deepEqual(recent, history.attempts[0]);
    const { data: otherHistory } = await request('/api/quizzes/attempts', { cookie: outsider.cookie });
    assert.deepEqual(otherHistory.attempts, []);
    assert.equal((await request('/api/quizzes/recent', { cookie: outsider.cookie })).data, null);
    assert.equal((await request('/api/quizzes/performance', { cookie: outsider.cookie })).data.totalQuizzes, 0);

    const { data: performance } = await request('/api/quizzes/performance', { cookie: player.cookie });
    assert.deepEqual(performance, {
      totalQuizzes: 3, totalQuestions: 6, correctAnswers: 4, accuracy: 67,
      byGenre: [
        { name: 'Geography', correct: 1, total: 2, accuracy: 50 },
        { name: 'Science', correct: 3, total: 4, accuracy: 75 },
      ],
      byDifficulty: [
        { name: 'Easy', correct: 1, total: 2, accuracy: 50 },
        { name: 'Hard', correct: 1, total: 2, accuracy: 50 },
        { name: 'Medium', correct: 2, total: 2, accuracy: 100 },
      ],
      byFormat: [
        { name: 'MCQ', correct: 1, total: 2, accuracy: 50 },
        { name: 'Short Answer', correct: 1, total: 2, accuracy: 50 },
        { name: 'True-False', correct: 2, total: 2, accuracy: 100 },
      ],
    });

    // Authors may review their quizzes, but their own answers must not earn rank.
    for (const [index, quiz] of quizzes.entries()) {
      await submit(author.cookie, quiz, quiz.questions.map((question, i) => ({ questionId: question._id, answer: definitions[index].questions[i].correctAnswer })));
    }
    const { data: leaderboard } = await request('/api/quizzes/leaderboard', { cookie: player.cookie });
    assert.deepEqual(leaderboard, {
      entries: [{ rank: 1, userId: player.user._id, name: 'Quiz Player', correct: 4, total: 6, quizzes: 3, accuracy: 67 }],
      genres: ['Geography', 'Science'],
    });
    const { data: science } = await request('/api/quizzes/leaderboard?genre=Science', { cookie: player.cookie });
    assert.deepEqual(science.entries, [{ rank: 1, userId: player.user._id, name: 'Quiz Player', correct: 3, total: 4, quizzes: 2, accuracy: 75 }]);
    assert.deepEqual(science.genres, ['Geography', 'Science']);
    assert.deepEqual((await request('/api/quizzes/leaderboard?genre=Unknown', { cookie: player.cookie })).data.entries, []);
    for (const account of [player, author]) {
      const { data: me } = await request('/api/auth/me', { cookie: account.cookie });
      assert.equal(me.user._id, account.user._id);
      assert.equal(me.user.totalQuizzes, 3);
      assert.equal(me.user.streak, 1);
      for (const field of ['password', 'googleId', 'loginAttempts', 'lockUntil']) assert.equal(field in me.user, false);
    }

    const { data: loggedIn, headers: loginHeaders } = await request('/api/auth/login', { method: 'POST', body: { email: player.email, password } });
    assert.equal(loggedIn.user.totalQuizzes, 3);
    assert.equal(loggedIn.user.streak, 1);
    const loginCookie = loginHeaders.get('set-cookie').split(';')[0];
    const { headers: logoutHeaders } = await request('/api/auth/logout', { method: 'POST', cookie: loginCookie, status: 204 });
    assert.match(logoutHeaders.get('set-cookie'), /^token=; Path=\/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Strict$/);
    await request('/api/auth/me', { cookie: 'token=', status: 401 });
    await request('/api/auth/logout', { method: 'POST', status: 204 });
  });

  it('returns explicit empty states without manufacturing activity from login', async () => {
    const account = await register();
    const { cookie } = account;
    assert.deepEqual((await request('/api/quizzes', { cookie })).data, { quizzes: [], page: 1, pages: 1 });
    assert.deepEqual((await request('/api/quizzes/attempts', { cookie })).data, { attempts: [], page: 1, pages: 1 });
    assert.equal((await request('/api/quizzes/recent', { cookie })).data, null);
    assert.deepEqual((await request('/api/quizzes/leaderboard', { cookie })).data, { entries: [], genres: [] });
    assert.deepEqual((await request('/api/quizzes/performance', { cookie })).data, {
      totalQuizzes: 0, totalQuestions: 0, correctAnswers: 0, accuracy: 0, byGenre: [], byDifficulty: [], byFormat: [],
    });
    const { data } = await request('/api/auth/login', { method: 'POST', body: { email: account.email, password } });
    assert.equal(data.user.streak, 0);
    assert.equal(data.user.totalQuizzes, 0);
  });

  it('enforces the bcrypt byte boundary for registration, login, and direct model writes', async () => {
    const User = mongoose.model('User');
    for (const [index, boundary] of [`Aa1${'x'.repeat(69)}`, `Aa1${'é'.repeat(34)}x`].entries()) {
      assert.equal(Buffer.byteLength(boundary), 72);
      const email = `boundary${index}@example.com`;
      await request('/api/auth/register', { method: 'POST', body: { name: 'Boundary Player', email, password: boundary }, status: 201 });
      await request('/api/auth/login', { method: 'POST', body: { email, password: boundary } });
      for (const suffix of ['a', 'DIFFERENT']) {
        const { data, headers } = await request('/api/auth/login', { method: 'POST', body: { email, password: boundary + suffix }, status: 422 });
        assert.match(data.message, /72 UTF-8 bytes/);
        assert.equal(headers.get('set-cookie'), null);
      }
    }
    for (const candidate of [`Aa1${'x'.repeat(70)}`, `Aa1${'é'.repeat(35)}`]) {
      const { data } = await request('/api/auth/register', { method: 'POST', body: { name: 'Long Player', email: 'toolong@example.com', password: candidate }, status: 422 });
      assert.match(data.message, /72 UTF-8 bytes/);
      await assert.rejects(User.create({ name: 'Long Player', email: 'direct@example.com', password: candidate }), /72 UTF-8 bytes/);
    }
    assert.equal(await User.countDocuments(), 2);
  });

  it('locks concurrent login failures atomically and restarts counting after expiry', async () => {
    const account = await register();
    const User = mongoose.model('User');
    const fail = () => request('/api/auth/login', { method: 'POST', body: { email: account.email, password: 'WrongPassword123!' }, status: 401 });
    await Promise.all(Array.from({ length: 5 }, fail));
    let saved = await User.findById(account.user._id).select('+loginAttempts +lockUntil');
    assert.equal(saved.loginAttempts, 5);
    assert.ok(saved.lockUntil > new Date());
    await request('/api/auth/login', { method: 'POST', body: { email: account.email, password }, status: 429 });

    // An already-fetched document cannot remove a lock acquired in the meantime.
    assert.equal(await saved.resetLoginAttempts(), null);
    const lockUntil = saved.lockUntil.getTime();
    const stillLocked = await saved.incLoginAttempts();
    assert.equal(stillLocked.loginAttempts, 5);
    assert.equal(stillLocked.lockUntil.getTime(), lockUntil);

    await User.updateOne({ _id: account.user._id }, { $set: { lockUntil: new Date(Date.now() - 1000) } });
    const { data } = await fail();
    assert.match(data.message, /4 attempt\(s\) remaining/);
    saved = await User.findById(account.user._id).select('+loginAttempts +lockUntil');
    assert.equal(saved.loginAttempts, 1);
    assert.ok(!saved.isLocked);
    await request('/api/auth/login', { method: 'POST', body: { email: account.email, password } });
    saved = await User.findById(account.user._id).select('+loginAttempts +lockUntil');
    assert.equal(saved.loginAttempts, 0);
    assert.ok(!saved.isLocked);
  });

  it('accepts valid email syntax consistently and still rejects malformed addresses', async () => {
    const User = mongoose.model('User');
    for (const email of ['player@example.technology', 'player+quiz@example.com', 'player@quiz-club.com']) {
      const { data } = await request('/api/auth/register', { method: 'POST', body: { name: 'Email Player', email: `  ${email.toUpperCase()}  `, password }, status: 201 });
      assert.equal(data.user.email, email);
      const login = await request('/api/auth/login', { method: 'POST', body: { email: email.toUpperCase(), password } });
      assert.equal(login.data.user._id, data.user._id);
    }
    for (const email of ['missing-at.example.com', 'player@', 'player@example..com', 'player name@example.com']) {
      await request('/api/auth/register', { method: 'POST', body: { name: 'Email Player', email, password }, status: 422 });
      await assert.rejects(new User({ name: 'Email Player', email, password }).validate(), /valid email/);
    }
    assert.equal(await User.countDocuments(), 3);
  });

  it('rejects Google email conflicts without linking or changing the original local login', async (t) => {
    const previous = process.env.GOOGLE_CLIENT_ID;
    t.after(() => {
      if (previous === undefined) delete process.env.GOOGLE_CLIENT_ID;
      else process.env.GOOGLE_CLIENT_ID = previous;
    });
    process.env.GOOGLE_CLIENT_ID = 'test-only-google-client';
    const local = await register('Local Player');
    const User = mongoose.model('User');
    const original = await User.findById(local.user._id).select('+googleId +password').lean();
    assert.equal(original.googleId, null);
    const verify = t.mock.method(OAuth2Client.prototype, 'verifyIdToken', async () => ({
      getPayload: () => ({ sub: 'unmatched-google-identity', email: local.email, email_verified: true, name: 'Google Player' }),
    }));

    const conflict = await request('/api/auth/google', { method: 'POST', body: { credential: 'test-google-token' }, status: 409 });
    assert.equal(conflict.headers.get('set-cookie'), null);
    assert.deepEqual(verify.mock.calls[0].arguments, [{ idToken: 'test-google-token', audience: 'test-only-google-client' }]);
    const { data: login, headers } = await request('/api/auth/login', { method: 'POST', body: { email: local.email, password } });
    assert.equal(login.user._id, local.user._id);
    assert.equal(login.user.authProvider, 'local');
    const cookie = headers.get('set-cookie').split(';')[0];
    const { data: me } = await request('/api/auth/me', { cookie });
    assert.equal(me.user._id, local.user._id);
    assert.equal(me.user.authProvider, 'local');
    const retry = await request('/api/auth/google', { method: 'POST', cookie, body: { credential: 'test-google-token' }, status: 409 });
    assert.equal(retry.headers.get('set-cookie'), null);
    const unchanged = await User.findById(local.user._id).select('+googleId +password').lean();
    assert.equal(unchanged.googleId, original.googleId);
    assert.equal(unchanged.password, original.password);
    assert.equal(unchanged.authProvider, 'local');
    assert.equal(await User.countDocuments(), 1);
    assert.equal(verify.mock.callCount(), 2);
  });

  it('creates a verified Google account once and signs the same provider identity in again', async (t) => {
    const previous = process.env.GOOGLE_CLIENT_ID;
    t.after(() => {
      if (previous === undefined) delete process.env.GOOGLE_CLIENT_ID;
      else process.env.GOOGLE_CLIENT_ID = previous;
    });
    process.env.GOOGLE_CLIENT_ID = 'test-only-google-client';
    const payload = { sub: 'new-google-identity', email: 'googleplayer+quiz@example.technology', email_verified: true, name: 'Google Player' };
    const verify = t.mock.method(OAuth2Client.prototype, 'verifyIdToken', async () => ({ getPayload: () => payload }));
    let userId;
    for (let i = 0; i < 2; i += 1) {
      const { data, headers } = await request('/api/auth/google', { method: 'POST', body: { credential: 'test-google-token' } });
      if (i === 0) userId = data.user._id;
      assert.equal(data.user._id, userId);
      assert.equal(data.user.email, payload.email);
      assert.equal(data.user.authProvider, 'google');
      assert.equal(data.user.totalQuizzes, 0);
      assert.equal(data.user.streak, 0);
      assert.equal('password' in data.user, false);
      assert.equal('googleId' in data.user, false);
      const setCookie = headers.get('set-cookie');
      assert.match(setCookie, /^token=.+; Max-Age=2592000;/);
      assert.match(setCookie, /; HttpOnly/);
      assert.match(setCookie, /; SameSite=Strict/);
      const cookie = setCookie.split(';')[0];
      assert.equal((await request('/api/auth/me', { cookie })).data.user._id, userId);
      await request('/api/auth/logout', { method: 'POST', cookie, status: 204 });
    }
    const User = mongoose.model('User');
    assert.equal(await User.countDocuments(), 1);
    const saved = await User.findById(userId).select('+googleId +password').lean();
    assert.equal(saved.googleId, payload.sub);
    assert.equal(saved.password, undefined);
    assert.equal(verify.mock.callCount(), 2);
  });

  it('rejects unverified Google email claims without creating an account or session', async (t) => {
    const previous = process.env.GOOGLE_CLIENT_ID;
    t.after(() => {
      if (previous === undefined) delete process.env.GOOGLE_CLIENT_ID;
      else process.env.GOOGLE_CLIENT_ID = previous;
    });
    process.env.GOOGLE_CLIENT_ID = 'test-only-google-client';
    const payload = { sub: 'unverified-google-identity', email: 'unverified@example.com', name: 'Unverified Player' };
    const verify = t.mock.method(OAuth2Client.prototype, 'verifyIdToken', async () => ({ getPayload: () => payload }));
    for (const verified of [false, undefined, 'true']) {
      payload.email_verified = verified;
      const { headers } = await request('/api/auth/google', { method: 'POST', body: { credential: 'test-google-token' }, status: 401 });
      assert.equal(headers.get('set-cookie'), null);
    }
    assert.equal(await mongoose.model('User').countDocuments(), 0);
    assert.equal(verify.mock.callCount(), 3);
  });

  it('returns 503 without contacting Google when the provider is not configured', async (t) => {
    const previous = process.env.GOOGLE_CLIENT_ID;
    t.after(() => {
      if (previous === undefined) delete process.env.GOOGLE_CLIENT_ID;
      else process.env.GOOGLE_CLIENT_ID = previous;
    });
    delete process.env.GOOGLE_CLIENT_ID;
    const verify = t.mock.method(OAuth2Client.prototype, 'verifyIdToken', async () => {
      throw new Error('Google verification must not run without configuration');
    });
    const { headers } = await request('/api/auth/google', { method: 'POST', body: { credential: 'test-google-token' }, status: 503 });
    assert.equal(headers.get('set-cookie'), null);
    assert.equal(verify.mock.callCount(), 0);
    assert.equal(await mongoose.model('User').countDocuments(), 0);
  });

  it('requires cookie authentication on every quiz endpoint', async () => {
    for (const [method, path] of [
      ['GET', '/api/quizzes'], ['POST', '/api/quizzes'], ['GET', `/api/quizzes/${unknownId}`],
      ['POST', `/api/quizzes/${unknownId}/submit`], ['GET', '/api/quizzes/recent'],
      ['GET', '/api/quizzes/attempts'], ['GET', `/api/quizzes/attempts/${unknownId}`],
      ['GET', '/api/quizzes/performance'], ['GET', '/api/quizzes/leaderboard'], ['GET', '/api/auth/me'],
    ]) {
      await request(path, { method, status: 401 });
    }
    await request('/api/quizzes', { cookie: 'token=not-a-jwt', status: 401 });
  });

  it('distinguishes malformed IDs from valid IDs that do not exist', async () => {
    const { cookie } = await register();
    for (const id of ['not-an-id', '123456789012', 'z'.repeat(24), unknownId]) {
      const status = id === unknownId ? 404 : 400;
      await request(`/api/quizzes/${id}`, { cookie, status });
      await request(`/api/quizzes/${id}/submit`, { method: 'POST', cookie, body: { answers: [] }, status });
      await request(`/api/quizzes/attempts/${id}`, { cookie, status });
    }
  });

  it('rejects malformed quiz metadata, question types, and options without saving quizzes', async () => {
    const { cookie } = await register();
    const cases = [
      ['null body', null], ['array body', []], ['numeric title', quizBody('MCQ', { title: 42 })],
      ['blank genre', quizBody('MCQ', { genre: ' ' })], ['unknown difficulty', quizBody('MCQ', { difficulty: 'Impossible' })],
      ['unknown format', quizBody('MCQ', { format: 'Essay' })], ['non-array questions', quizBody('MCQ', { questions: {} })],
      ['no questions', quizBody('MCQ', { questions: [] })], ['null question', quizBody('MCQ', { questions: [null] })],
      ['too many questions', quizBody('MCQ', { questions: Array.from({ length: 31 }, () => quizBody().questions[0]) })],
    ];
    for (const [label, changes] of [
      ['non-string question', { questionText: false }], ['non-string answer', { correctAnswer: 42 }],
      ['non-string explanation', { explanation: {} }], ['non-array options', { options: 'Mars' }],
      ['too few options', { options: ['Mars'] }], ['too many options', { options: ['Mars', 'a', 'b', 'c', 'd', 'e', 'f'] }],
      ['non-string option', { options: ['Mars', 42] }], ['normalized duplicate options', { options: ['Mars', ' MARS '] }],
      ['answer absent from options', { correctAnswer: 'Jupiter' }],
    ]) cases.push([label, quizBody('MCQ', { questions: [{ ...quizBody().questions[0], ...changes }] })]);
    cases.push(['invalid boolean answer', quizBody('True-False', { questions: [{ questionText: 'True?', correctAnswer: 'yes' }] })]);
    for (const [label, body] of cases) {
      await request('/api/quizzes', { method: 'POST', cookie, body, status: body === null ? 400 : 422, label });
    }
    assert.deepEqual((await request('/api/quizzes', { cookie })).data.quizzes, []);
  });

  it('publishes a maximum-size 30-question Unicode quiz larger than 256 KiB', async () => {
    const { cookie } = await register();
    const options = Array.from({ length: 6 }, (_, index) => String.fromCodePoint(0x4e00 + index).repeat(500));
    const body = quizBody('MCQ', {
      title: '\u754c'.repeat(120),
      genre: '\u754c'.repeat(60),
      questions: Array.from({ length: 30 }, () => ({
        questionText: '\u754c'.repeat(2000),
        explanation: '\u754c'.repeat(2000),
        options,
        correctAnswer: options[0],
      })),
    });
    const bytes = Buffer.byteLength(JSON.stringify(body), 'utf8');
    assert.ok(bytes > 256 * 1024, `Expected a payload over 256 KiB, got ${bytes} bytes`);
    assert.ok(bytes < 2 * 1024 * 1024);
    const quiz = await createQuiz(cookie, body);
    assert.equal(quiz.title, body.title);
    assert.equal(quiz.genre, body.genre);
    assert.equal(quiz.questions.length, 30);
    for (const question of quiz.questions) {
      assert.equal(question.questionText, body.questions[0].questionText);
      assert.deepEqual(question.options, options);
    }
    assertNoAnswerKey(quiz);
    const { data: catalog } = await request('/api/quizzes', { cookie });
    assert.equal(catalog.quizzes.length, 1);
    assert.equal(catalog.quizzes[0]._id, quiz._id);
    assert.equal(catalog.quizzes[0].questionCount, 30);
  });

  it('deduplicates concurrent publications, detects changed content, and scopes keys to the author', async () => {
    const author = await register();
    const other = await register();
    const idempotencyKey = randomUUID();
    const body = quizBody();
    const publish = (overrides = {}) => request('/api/quizzes', { method: 'POST', cookie: author.cookie, body, idempotencyKey, status: [200, 201], ...overrides });
    const results = await Promise.all(Array.from({ length: 8 }, () => publish()));
    const saved = results[0].data;
    for (const { data } of results) assert.deepEqual(data, saved);
    assert.equal(await mongoose.model('Quiz').countDocuments(), 1);
    assert.equal(await mongoose.model('Question').countDocuments(), body.questions.length);
    assert.deepEqual((await publish({ status: 200 })).data, saved);
    assert.deepEqual((await publish({ body: { ...body, title: ` ${body.title} ` }, status: 200 })).data, saved);
    const conflict = await publish({ body: { ...body, title: 'Edited after a lost response' }, status: 409 });
    assert.equal(conflict.data.quizId, saved._id);
    assert.match(conflict.data.message, /already succeeded/);
    const independent = await publish({ cookie: other.cookie, status: 201 });
    assert.notEqual(independent.data._id, saved._id);
    assert.equal(await mongoose.model('Quiz').countDocuments(), 2);
    const playable = (await request(`/api/quizzes/${saved._id}`, { cookie: author.cookie })).data;
    assert.equal(playable.questions.length, body.questions.length);
    assertNoAnswerKey(playable);
    assert.equal('publicationKey' in playable, false);
    assert.equal('publicationHash' in playable, false);
  });

  it('validates publication keys without reserving invalid requests and supports legacy quizzes', async () => {
    const { cookie, user } = await register();
    for (const idempotencyKey of [null, 'not-a-uuid']) {
      await request('/api/quizzes', { method: 'POST', cookie, body: quizBody(), idempotencyKey, status: 400 });
    }
    const idempotencyKey = randomUUID();
    await request('/api/quizzes', { method: 'POST', cookie, body: quizBody('MCQ', { title: '' }), idempotencyKey, status: 422 });
    await request('/api/quizzes', { method: 'POST', cookie, body: quizBody(), idempotencyKey, status: 201 });
    const { questions, ...metadata } = quizBody();
    await mongoose.model('Quiz').create([{ ...metadata, createdBy: user._id }, { ...metadata, createdBy: user._id }]);
    assert.equal(await mongoose.model('Quiz').countDocuments(), 3);
  });

  it('keeps the auth JSON limit at 10 KiB despite the larger quiz limit', async () => {
    const account = await register();
    const body = { email: account.email, password, padding: 'x'.repeat(10 * 1024) };
    assert.ok(Buffer.byteLength(JSON.stringify(body), 'utf8') > 10 * 1024);
    const { headers } = await request('/api/auth/login', { method: 'POST', body, status: 413 });
    assert.equal(headers.get('set-cookie'), null);
    const { data } = await request('/api/auth/login', { method: 'POST', body: { email: account.email, password } });
    assert.equal(data.user._id, account.user._id);
  });

  it('rejects unknown, duplicate, malformed, and invalid-choice answers without saving an attempt', async () => {
    const author = await register();
    const player = await register();
    const quiz = await createQuiz(author.cookie);
    const otherQuiz = await createQuiz(author.cookie);
    const questionId = quiz.questions[0]._id;
    const cases = [
      ['missing answers', {}], ['null answers', { answers: null }], ['object answers', { answers: {} }],
      ['unknown question', { answers: [{ questionId: unknownId, answer: 'Mars' }] }],
      ['another quiz question', { answers: [{ questionId: otherQuiz.questions[0]._id, answer: 'Mars' }] }],
      ['duplicate question', { answers: [{ questionId, answer: 'Mars' }, { questionId, answer: 'Venus' }] }],
      ['too many answers', { answers: Array.from({ length: 3 }, () => ({ questionId, answer: 'Mars' })) }],
      ['null answer entry', { answers: [null] }], ['numeric question ID', { answers: [{ questionId: 1, answer: 'Mars' }] }],
      ['numeric answer', { answers: [{ questionId, answer: 1 }] }], ['null answer', { answers: [{ questionId, answer: null }] }],
      ['object answer', { answers: [{ questionId, answer: { $ne: '' } }] }],
      ['overlong answer', { answers: [{ questionId, answer: 'x'.repeat(501) }] }],
      ['unlisted option', { answers: [{ questionId, answer: 'Jupiter' }] }],
      ['wrong-case option', { answers: [{ questionId, answer: 'mars' }] }],
    ];
    for (const [label, body] of cases) {
      await request(`/api/quizzes/${quiz._id}/submit`, { method: 'POST', cookie: player.cookie, body, status: 422, label });
    }
    assert.deepEqual((await request('/api/quizzes/attempts', { cookie: player.cookie })).data.attempts, []);
    assert.equal((await request(`/api/quizzes/${quiz._id}`, { cookie: player.cookie })).data.attemptId, null);
    const { data } = await submit(player.cookie, quiz, [{ questionId, answer: 'Mars' }]);
    assert.equal(data.score, 1);
    assert.equal(data.answers[1].answer, '');
  });

  it('deduplicates simultaneous submissions and returns the saved attempt on later retries', async () => {
    const author = await register();
    const player = await register();
    const quiz = await createQuiz(author.cookie);
    const answers = quiz.questions.map((question, index) => ({ questionId: question._id, answer: ['Mars', 'Saturn'][index] }));
    const results = await Promise.all(Array.from({ length: 8 }, () => submit(player.cookie, quiz, answers)));
    const saved = results[0].data;
    assert.equal(saved.score, 2);
    for (const { data } of results) assert.deepEqual(data, saved);
    assert.deepEqual((await submit(player.cookie, quiz, [])).data, saved);
    const { data: history } = await request('/api/quizzes/attempts', { cookie: player.cookie });
    assert.equal(history.attempts.length, 1);
    assert.equal(history.attempts[0]._id, saved._id);
    assert.equal((await request('/api/quizzes/performance', { cookie: player.cookie })).data.totalQuizzes, 1);
    assert.equal((await request('/api/auth/me', { cookie: player.cookie })).data.user.totalQuizzes, 1);
    const { data: board } = await request('/api/quizzes/leaderboard', { cookie: player.cookie });
    assert.equal(board.entries[0].quizzes, 1);
    assert.equal(board.entries[0].correct, 2);
  });

  it('accepts all-skipped submissions and records zero scores, not missing activity', async () => {
    const author = await register();
    const player = await register();
    const quiz = await createQuiz(author.cookie, quizBody('Short Answer'));
    const { data } = await submit(player.cookie, quiz, [{ questionId: quiz.questions[0]._id, answer: ' \t\n ' }]);
    assert.equal(data.score, 0);
    assert.equal(data.total, 2);
    assert.equal(data.accuracy, 0);
    for (const answer of data.answers) {
      assert.equal(answer.answer, '');
      assert.equal(answer.isCorrect, false);
    }
    const { data: me } = await request('/api/auth/me', { cookie: player.cookie });
    assert.equal(me.user.totalQuizzes, 1);
    assert.equal(me.user.streak, 1);
  });

  it('ranks eligible players and excludes only attempts on their own authored quizzes', async () => {
    const author = await register('Quiz Author');
    const winner = await register('Top Player');
    const runnerUp = await register('Other Author');
    const science = await createQuiz(author.cookie);
    const geography = await createQuiz(runnerUp.cookie, quizBody('Short Answer', { genre: 'Geography' }));
    const correct = science.questions.map((question, index) => ({ questionId: question._id, answer: ['Mars', 'Saturn'][index] }));
    await submit(author.cookie, science, correct);
    await submit(winner.cookie, science, correct);
    await submit(runnerUp.cookie, science, correct.slice(0, 1));
    await submit(author.cookie, geography, []);

    const { data } = await request('/api/quizzes/leaderboard', { cookie: winner.cookie });
    assert.deepEqual(data.entries, [
      { rank: 1, userId: winner.user._id, name: 'Top Player', correct: 2, total: 2, quizzes: 1, accuracy: 100 },
      { rank: 2, userId: runnerUp.user._id, name: 'Other Author', correct: 1, total: 2, quizzes: 1, accuracy: 50 },
      { rank: 3, userId: author.user._id, name: 'Quiz Author', correct: 0, total: 2, quizzes: 1, accuracy: 0 },
    ]);
    const { data: filtered } = await request('/api/quizzes/leaderboard?genre=Science', { cookie: winner.cookie });
    assert.deepEqual(filtered.entries, data.entries.slice(0, 2));
    assert.deepEqual(filtered.genres, ['Geography', 'Science']);
  });

  it('rounds a halfway accuracy consistently in saved attempts, performance, and leaderboard', async () => {
    const author = await register();
    const player = await register();
    const questions = Array.from({ length: 8 }, (_, index) => ({ ...quizBody().questions[0], questionText: `Red planet question ${index}?` }));
    const quiz = await createQuiz(author.cookie, quizBody('MCQ', { questions }));
    const { data: attempt } = await submit(player.cookie, quiz, [{ questionId: quiz.questions[0]._id, answer: 'Mars' }]);
    const { data: performance } = await request('/api/quizzes/performance', { cookie: player.cookie });
    const { data: board } = await request('/api/quizzes/leaderboard?genre=Science', { cookie: player.cookie });
    // One correct answer out of eight is 12.5%, rounded to 13% by quiz scoring.
    assert.deepEqual({
      saved: attempt.accuracy,
      overall: performance.accuracy,
      genre: performance.byGenre[0].accuracy,
      difficulty: performance.byDifficulty[0].accuracy,
      format: performance.byFormat[0].accuracy,
      leaderboard: board.entries[0].accuracy,
    }, { saved: 13, overall: 13, genre: 13, difficulty: 13, format: 13, leaderboard: 13 });
  });

  it('rounds 23 correct answers out of 40 to 58 percent across all aggregate statistics', async () => {
    const author = await register();
    const player = await register('Quiz Player');
    for (const correct of [11, 12]) {
      const questions = Array.from({ length: 20 }, (_, index) => ({ ...quizBody().questions[0], questionText: `Red planet question ${index}?` }));
      const quiz = await createQuiz(author.cookie, quizBody('MCQ', { questions }));
      const answers = quiz.questions.map((question, index) => ({ questionId: question._id, answer: index < correct ? 'Mars' : 'Venus' }));
      const { data: attempt } = await submit(player.cookie, quiz, answers);
      assert.equal(attempt.score, correct);
      assert.equal(attempt.total, 20);
      assert.equal(attempt.accuracy, correct === 11 ? 55 : 60);
    }
    const { data: performance } = await request('/api/quizzes/performance', { cookie: player.cookie });
    assert.deepEqual(performance, {
      totalQuizzes: 2, totalQuestions: 40, correctAnswers: 23, accuracy: 58,
      byGenre: [{ name: 'Science', correct: 23, total: 40, accuracy: 58 }],
      byDifficulty: [{ name: 'Easy', correct: 23, total: 40, accuracy: 58 }],
      byFormat: [{ name: 'MCQ', correct: 23, total: 40, accuracy: 58 }],
    });
    for (const query of ['', '?genre=Science']) {
      const { data: board } = await request(`/api/quizzes/leaderboard${query}`, { cookie: player.cookie });
      assert.deepEqual(board, {
        entries: [{ rank: 1, userId: player.user._id, name: 'Quiz Player', correct: 23, total: 40, quizzes: 2, accuracy: 58 }],
        genres: ['Science'],
      });
    }
  });

  it('paginates catalog and private history in stable newest-first order', async () => {
    const author = await register();
    const player = await register();
    const quizIds = [];
    const attemptIds = [];
    for (let i = 0; i < 13; i += 1) {
      const quiz = await createQuiz(author.cookie, quizBody('MCQ', { title: `Quiz ${i}` }));
      quizIds.push(quiz._id);
      attemptIds.push((await submit(player.cookie, quiz, [])).data._id);
    }
    for (const [path, field, expected] of [
      ['/api/quizzes', 'quizzes', quizIds.reverse()],
      ['/api/quizzes/attempts', 'attempts', attemptIds.reverse()],
    ]) {
      const { data: first } = await request(path, { cookie: player.cookie });
      const { data: second } = await request(`${path}?page=2`, { cookie: player.cookie });
      const { data: third } = await request(`${path}?page=3`, { cookie: player.cookie });
      assert.equal(first.page, 1);
      assert.equal(second.page, 2);
      assert.equal(third.page, 3);
      for (const page of [first, second, third]) assert.equal(page.pages, 2);
      assert.equal(first[field].length, 12);
      assert.equal(second[field].length, 1);
      assert.deepEqual(third[field], []);
      assert.deepEqual([...first[field], ...second[field]].map((entry) => entry._id), expected);
      assertNoAnswerKey(first);
      assertNoAnswerKey(second);
    }
    assert.deepEqual((await request('/api/quizzes/attempts', { cookie: author.cookie })).data, { attempts: [], page: 1, pages: 1 });
    assert.equal((await request('/api/quizzes/recent', { cookie: player.cookie })).data._id, attemptIds[0]);
  });

  it('rejects invalid pagination and genre query types', async () => {
    const { cookie } = await register();
    for (const path of ['/api/quizzes', '/api/quizzes/attempts']) {
      for (const query of ['page=0', 'page=-1', 'page=1.5', 'page=abc', 'page=', 'page=01', 'page=1000000', 'page=1&page=2']) {
        await request(`${path}?${query}`, { cookie, status: 400 });
      }
    }
    await request('/api/quizzes/leaderboard?genre=Science&genre=Art', { cookie, status: 400 });
    await request(`/api/quizzes/leaderboard?genre=${'x'.repeat(61)}`, { cookie, status: 400 });
  });

  it('uses Secure, HttpOnly, SameSite=Strict cookies for production login and logout', async () => {
    const account = await register();
    const previous = process.env.NODE_ENV;
    try {
      // Inspect headers over local HTTP; fetch does not act as a browser cookie jar.
      process.env.NODE_ENV = 'production';
      const { headers } = await request('/api/auth/login', { method: 'POST', body: { email: account.email, password } });
      const cookie = headers.get('set-cookie');
      for (const attribute of ['; Secure', '; HttpOnly', '; SameSite=Strict', '; Path=/']) assert.ok(cookie.includes(attribute));
      const { headers: logout } = await request('/api/auth/logout', { method: 'POST', status: 204 });
      const cleared = logout.get('set-cookie');
      assert.match(cleared, /^token=;/);
      assert.match(cleared, /Expires=Thu, 01 Jan 1970 00:00:00 GMT/);
      for (const attribute of ['; Secure', '; HttpOnly', '; SameSite=Strict', '; Path=/']) assert.ok(cleared.includes(attribute));
    } finally {
      process.env.NODE_ENV = previous;
    }
  });
});
