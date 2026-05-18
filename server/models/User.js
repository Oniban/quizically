// User model definition
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

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
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email',
    ],
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

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match entered password to hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

// Increment failed login attempts and lock if needed
userSchema.methods.incLoginAttempts = async function () {
  const LOCK_TIME = 30 * 60 * 1000; // 30 minutes
  const MAX_ATTEMPTS = 5;

  // If lock expired, reset
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 },
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };
  if (this.loginAttempts + 1 >= MAX_ATTEMPTS && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + LOCK_TIME };
  }
  return this.updateOne(updates);
};

// Reset failed attempts on successful login
userSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 },
  });
};

const User = mongoose.model('User', userSchema);
export default User;