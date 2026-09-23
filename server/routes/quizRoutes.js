// Routes for quiz operations
import express from 'express';
import mongoose from 'mongoose';
import { createQuiz, getAttempt, getLeaderboard, getPerformance, getQuiz, getRecentQuiz, listAttempts, listQuizzes, submitQuiz } from '../controllers/quizController.js';
import protect from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
for (const parameter of ['id', 'attemptId']) {
  router.param(parameter, (req, res, next, value) => {
    if (!mongoose.isObjectIdOrHexString(value)) return res.status(400).json({ message: 'Invalid resource ID.' });
    next();
  });
}

router.get('/', listQuizzes);
router.post('/', createQuiz);
router.get('/recent', getRecentQuiz);
router.get('/attempts', listAttempts);
router.get('/attempts/:attemptId', getAttempt);
router.get('/performance', getPerformance);
router.get('/leaderboard', getLeaderboard);
router.get('/:id', getQuiz);
router.post('/:id/submit', submitQuiz);

export default router;
