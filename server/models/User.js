// User model definition
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { fitsPasswordLimit, passwordLimitMessage } from '../services/passwordRules.js';
import { isValidEmail } from '../services/emailRules.js';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters'],
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: { validator: isValidEmail, message: 'Please add a valid email' },
  },
  password: {
    type: String,
    // Not required for OAuth users
    minlength: [8, 'Password must be at least 8 characters'],
    select: false,
  },
  // OAuth fields
  googleId: {
    type: String,
    default: null,
    select: false,
  },
  authProvider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local',
  },
  bio: {
    type: String,
    default: '',
    maxlength: [200, 'Bio cannot exceed 200 characters'],
  },
  streak: {
    type: Number,
    default: 0,
  },
  lastLoginDate: {
    type: Date,
    default: null,
  },
  totalQuizzes: {
    type: Number,
    default: 0,
  },
  profilePic: {
    type: String,
    default: '',
  },
  // Account security
  loginAttempts: {
    type: Number,
    default: 0,
    select: false,
  },
  lockUntil: {
    type: Date,
    default: null,
    select: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Virtual: is account locked?
userSchema.virtual('isLocked').get(function () {
  return this.lockUntil && this.lockUntil > Date.now();
});

// Encrypt password using bcrypt before save
userSchema.pre('save', async function () {
  // Only hash if password exists and was modified (skips OAuth users)
  if (!this.isModified('password') || !this.password) return;
  if (!fitsPasswordLimit(this.password)) {
    throw Object.assign(new Error(passwordLimitMessage), { status: 422 });
  }

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match entered password to hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password || !fitsPasswordLimit(enteredPassword)) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

// Compute the count and lock together against the current database document.
userSchema.methods.incLoginAttempts = async function () {
  const LOCK_TIME = 30 * 60 * 1000; // 30 minutes
  const MAX_ATTEMPTS = 5;
  const locked = { $gt: [{ $ifNull: ['$lockUntil', new Date(0)] }, '$$NOW'] };
  const expired = { $and: [{ $ne: [{ $ifNull: ['$lockUntil', null] }, null] }, { $lte: ['$lockUntil', '$$NOW'] }] };
  return this.constructor.findOneAndUpdate({ _id: this._id }, [
    { $set: { loginAttempts: { $cond: [locked, '$loginAttempts', { $cond: [expired, 1, { $add: [{ $ifNull: ['$loginAttempts', 0] }, 1] }] }] } } },
    { $set: { lockUntil: { $cond: [locked, '$lockUntil', { $cond: [{ $gte: ['$loginAttempts', MAX_ATTEMPTS] }, { $add: ['$$NOW', LOCK_TIME] }, '$$REMOVE'] }] } } },
  ], { returnDocument: 'after', updatePipeline: true }).select('+loginAttempts +lockUntil');
};

// Reset failed attempts on successful login
userSchema.methods.resetLoginAttempts = function () {
  // A lock acquired while bcrypt was running must also block a correct password.
  return this.constructor.findOneAndUpdate({
    _id: this._id,
    $or: [{ lockUntil: null }, { lockUntil: { $lte: new Date() } }],
  }, {
    $set: { loginAttempts: 0, lastLoginDate: new Date() },
    $unset: { lockUntil: 1 },
  }, { returnDocument: 'after' });
};

const User = mongoose.model('User', userSchema);
export default User;
