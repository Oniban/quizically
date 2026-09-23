import mongoose from 'mongoose';
import Attempt from '../models/Attempt.js';
import { calculateStreak } from './quizRules.js';

export async function getActivityStats(userId, now = new Date()) {
  const days = await Attempt.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(String(userId)) } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt', timezone: 'UTC' } }, count: { $sum: 1 } } },
  ]);
  return {
    totalQuizzes: days.reduce((total, day) => total + day.count, 0),
    streak: calculateStreak(days.map((day) => day._id), now),
  };
}
