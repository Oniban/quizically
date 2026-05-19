// Question of the Day model schema
import mongoose from 'mongoose';

const questionOfDaySchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
  },
  answer: {
    type: String,
    required: true,
  },
  aiExplanation: {
    type: String,
  },
  date: {
    type: Date,
    unique: true,
    required: true,
  },
});

const QuestionOfDay = mongoose.model('QuestionOfDay', questionOfDaySchema);
export default QuestionOfDay;
