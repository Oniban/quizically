import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
  questionText: { type: String, required: true },
  answer: { type: String, default: '' },
  correctAnswer: { type: String, required: true },
  explanation: { type: String, default: '' },
  isCorrect: { type: Boolean, required: true },
  genre: String,
  difficulty: String,
  format: String,
}, { _id: false });

// Immutable snapshots keep reviews and analytics independent of later content changes.
const attemptSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  title: { type: String, required: true },
  genre: { type: String, required: true },
  difficulty: { type: String, required: true },
  format: { type: String, required: true },
  score: { type: Number, required: true },
  total: { type: Number, required: true },
  accuracy: { type: Number, required: true },
  leaderboardEligible: { type: Boolean, required: true },
  answers: { type: [answerSchema], required: true },
  completedAt: { type: Date, default: Date.now, required: true },
});

attemptSchema.index({ user: 1, quizId: 1 }, { unique: true });
attemptSchema.index({ user: 1, completedAt: -1, _id: -1 });
attemptSchema.index({ leaderboardEligible: 1, genre: 1 });

export default mongoose.model('Attempt', attemptSchema);
