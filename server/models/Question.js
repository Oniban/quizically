// Question model schema
import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: true,
  },
  options: [{
    type: String,
  }],
  correctAnswer: {
    type: String,
    required: true,
  },
  explanation: {
    type: String,
  },
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
  },
  genre: {
    type: String,
  },
  format: {
    type: String,
    enum: ['MCQ', 'Short Answer', 'True-False'],
  },
  source: {
    type: String, // Which QM typically asks this
  },
});

const Question = mongoose.model('Question', questionSchema);
export default Question;
