import mongoose from 'mongoose';
import Quiz from '../models/Quiz.js';
import Question from '../models/Question.js';
import Attempt from '../models/Attempt.js';
import { invalid, scoreQuiz, validateQuiz } from '../services/quizRules.js';

const summaryFields = '_id quizId title genre difficulty format score total accuracy completedAt';
const pageSize = 12;

function pageNumber(value = '1') {
  if (typeof value !== 'string' || !/^[1-9]\d{0,5}$/.test(value)) throw invalid('Page must be a positive integer.', 400);
  return Number(value);
}

export async function listQuizzes(req, res) {
  const page = pageNumber(req.query.page);
  const [quizzes, count] = await Promise.all([
    Quiz.find().select('title genre difficulty format questions createdAt').sort({ createdAt: -1, _id: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
    Quiz.countDocuments(),
  ]);
  res.json({ quizzes: quizzes.map(({ questions, ...quiz }) => ({ ...quiz, questionCount: questions.length })), page, pages: Math.max(1, Math.ceil(count / pageSize)) });
}

export async function createQuiz(req, res) {
  const { questions, ...metadata } = validateQuiz(req.body);
  const documents = questions.map((question) => new Question(question));
  try {
    await Question.insertMany(documents);
    const quiz = await Quiz.create({ ...metadata, questions: documents.map((question) => question._id), createdBy: req.user._id });
    res.status(201).json({ _id: quiz._id });
  } catch (error) {
    // IDs are allocated before insert so partial failures can also be cleaned up.
    await Question.deleteMany({ _id: { $in: documents.map((question) => question._id) } }).catch(() => {});
    throw error;
  }
}

export async function getQuiz(req, res) {
  const [quiz, attempt] = await Promise.all([
    Quiz.findById(req.params.id).select('title genre difficulty format questions').populate({ path: 'questions', select: 'questionText options format' }).lean(),
    Attempt.findOne({ user: req.user._id, quizId: req.params.id }).select('_id').lean(),
  ]);
  if (!quiz) throw invalid('Quiz not found.', 404);
  res.json({ ...quiz, questions: quiz.questions.map((question) => ({ ...question, format: question.format || quiz.format })), attemptId: attempt?._id || null });
}

export async function submitQuiz(req, res) {
  const filter = { user: req.user._id, quizId: req.params.id };
  const existing = await Attempt.findOne(filter).select('-user -leaderboardEligible -__v').lean();
  if (existing) return res.json(existing);
  const quiz = await Quiz.findById(req.params.id).populate('questions').lean();
  if (!quiz) throw invalid('Quiz not found.', 404);
  if (!quiz.questions.length) throw invalid('This quiz has no playable questions.', 409);
  const result = scoreQuiz(quiz, req.body?.answers);
  let attempt;
  try {
    attempt = await Attempt.create({
      ...filter,
      title: quiz.title,
      genre: quiz.genre,
      difficulty: quiz.difficulty,
      format: quiz.format,
      leaderboardEligible: String(quiz.createdBy) !== String(req.user._id),
      ...result,
    });
  } catch (error) {
    // The unique index makes simultaneous requests and network retries idempotent.
    if (error.code !== 11000) throw error;
    attempt = await Attempt.findOne(filter);
    if (!attempt) throw error;
  }
  const { user, leaderboardEligible, __v, ...saved } = attempt.toObject();
  res.json(saved);
}

export async function getRecentQuiz(req, res) {
  res.json(await Attempt.findOne({ user: req.user._id }).select(summaryFields).sort({ completedAt: -1, _id: -1 }).lean());
}

export async function listAttempts(req, res) {
  const page = pageNumber(req.query.page);
  const filter = { user: req.user._id };
  const [attempts, count] = await Promise.all([
    Attempt.find(filter).select(summaryFields).sort({ completedAt: -1, _id: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
    Attempt.countDocuments(filter),
  ]);
  res.json({ attempts, page, pages: Math.max(1, Math.ceil(count / pageSize)) });
}

export async function getAttempt(req, res) {
  const attempt = await Attempt.findOne({ _id: req.params.attemptId, user: req.user._id }).select('-user -leaderboardEligible -__v').lean();
  if (!attempt) throw invalid('Attempt not found.', 404);
  res.json(attempt);
}

// Use half-up percentages, not MongoDB's half-even $round; multiply before dividing.
const breakdown = (field) => [
  { $unwind: '$answers' },
  { $group: { _id: `$answers.${field}`, correct: { $sum: { $cond: ['$answers.isCorrect', 1, 0] } }, total: { $sum: 1 } } },
  { $project: { _id: 0, name: '$_id', correct: 1, total: 1, accuracy: { $floor: { $add: [{ $divide: [{ $multiply: ['$correct', 100] }, '$total'] }, 0.5] } } } },
  { $sort: { name: 1 } },
];

export async function getPerformance(req, res) {
  const [data] = await Attempt.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(String(req.user._id)) } },
    { $facet: {
      totals: [{ $group: { _id: null, totalQuizzes: { $sum: 1 }, totalQuestions: { $sum: '$total' }, correctAnswers: { $sum: '$score' } } }],
      byGenre: breakdown('genre'), byDifficulty: breakdown('difficulty'), byFormat: breakdown('format'),
    } },
  ]);
  const { _id, ...totals } = data.totals[0] || { totalQuizzes: 0, totalQuestions: 0, correctAnswers: 0 };
  res.json({ ...totals, accuracy: totals.totalQuestions ? Math.round(totals.correctAnswers * 100 / totals.totalQuestions) : 0, byGenre: data.byGenre, byDifficulty: data.byDifficulty, byFormat: data.byFormat });
}

export async function getLeaderboard(req, res) {
  const genre = req.query.genre;
  if (genre !== undefined && (typeof genre !== 'string' || genre.length > 60)) throw invalid('Invalid genre filter.', 400);
  const filter = { leaderboardEligible: true, ...(genre ? { genre } : {}) };
  const [entries, genres] = await Promise.all([
    Attempt.aggregate([
      { $match: filter },
      { $group: { _id: '$user', correct: { $sum: '$score' }, total: { $sum: '$total' }, quizzes: { $sum: 1 } } },
      { $addFields: { ratio: { $divide: ['$correct', '$total'] } } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'player' } },
      { $unwind: '$player' },
      { $sort: { correct: -1, ratio: -1, _id: 1 } },
      { $limit: 100 },
      { $project: { _id: 0, userId: '$_id', name: '$player.name', correct: 1, total: 1, quizzes: 1, accuracy: { $floor: { $add: [{ $divide: [{ $multiply: ['$correct', 100] }, '$total'] }, 0.5] } } } },
    ]),
    Attempt.distinct('genre', { leaderboardEligible: true }),
  ]);
  res.json({ entries: entries.map((entry, index) => ({ ...entry, rank: index + 1 })), genres: genres.sort() });
}
