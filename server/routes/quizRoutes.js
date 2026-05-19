// Routes for quiz operations
import express from 'express';
import { getRecentQuiz } from '../controllers/quizController.js';
import protect from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/recent', protect, getRecentQuiz);

export default router;
