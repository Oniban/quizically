// Quiz model schema
import mongoose from 'mongoose';

const quizSchema = new mongoose.Schema({
  publicationKey: { type: String, select: false },
  publicationHash: { type: String, select: false },
  title: {
    type: String,
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  questions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
  }],
  genre: {
    type: String,
    required: true,
  },
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
    default: 'Medium',
  },
  format: {
    type: String,
    enum: ['MCQ', 'Short Answer', 'True-False'],
    required: true,
  },
  timesPlayed: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

quizSchema.index({ createdAt: -1, _id: -1 });
// Older quizzes have no publication key and remain valid without a migration.
quizSchema.index({ createdBy: 1, publicationKey: 1 }, {
  unique: true,
  partialFilterExpression: { publicationKey: { $type: 'string' } },
});

const Quiz = mongoose.model('Quiz', quizSchema);
export default Quiz;
