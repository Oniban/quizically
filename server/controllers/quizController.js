// Controller for quiz related operations
import Quiz from '../models/Quiz.js';

// @desc    Get most recent quiz taken by user
// @route   GET /api/quizzes/recent
// @access  Private
export const getRecentQuiz = async (req, res, next) => {
  try {
    // For now, since we don't have a "UserQuiz" model to track history, 
    // we'll just return the most recently created quiz as a placeholder 
    // or an empty array if none exist.
    const quiz = await Quiz.findOne().sort({ createdAt: -1 });
    
    if (!quiz) {
      return res.status(200).json(null);
    }
    
    res.json(quiz);
  } catch (error) {
    next(error);
  }
};
