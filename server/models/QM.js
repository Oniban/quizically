// Quiz Master (QM) model schema
import mongoose from 'mongoose';

const qmSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  bio: {
    type: String,
  },
  college: {
    type: String,
  },
  profilePic: {
    type: String,
  },
  preferredGenres: [{
    type: String,
  }],
  preferredFormats: [{
    type: String,
  }],
  preferredDifficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
  },
  pastQuestions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
  }],
});

const QM = mongoose.model('QM', qmSchema);
export default QM;
