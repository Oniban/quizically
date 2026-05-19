// Auth controller — register, login, Google OAuth, getMe
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import { OAuth2Client } from 'google-auth-library';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  streak: user.streak,
  profilePic: user.profilePic,
  authProvider: user.authProvider,
});

const updateStreak = (user) => {
  const now = new Date();
  const lastLogin = user.lastLoginDate;

  if (!lastLogin) {
    user.streak = 1;
  } else {
    const today = new Date(now).setHours(0, 0, 0, 0);
    const last = new Date(lastLogin).setHours(0, 0, 0, 0);
    const diffDays = (today - last) / (1000 * 60 * 60 * 24);

    if (diffDays === 1) user.streak += 1;
    else if (diffDays > 1) user.streak = 1;
    // diffDays === 0 → same day, keep streak
  }

  user.lastLoginDate = now;
};

// ─── Register ─────────────────────────────────────────────────────────────────

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res, next) => {
  try {
    // express-validator errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ message: errors.array()[0].msg, errors: errors.array() });
    }

    const { name, email, password } = req.body;

    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      // Don't reveal which field caused the conflict to prevent user enumeration
      return res.status(409).json({ message: 'An account with that email already exists' });
    }

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      streak: 1,
      lastLoginDate: new Date(),
      authProvider: 'local',
    });

    res.status(201).json({
      user: sanitizeUser(user),
      token: generateToken(user._id),
    });
  } catch (error) {
    next(error);
  }
};

// ─── Login ────────────────────────────────────────────────────────────────────

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ message: errors.array()[0].msg });
    }

    const { email, password } = req.body;

    // Always select password + lock fields
    const user = await User.findOne({ email: email.toLowerCase() }).select(
      '+password +loginAttempts +lockUntil'
    );

    // No user found — use same message as wrong password to prevent enumeration
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // OAuth-only account (no password set)
    if (user.authProvider !== 'local' || !user.password) {
      return res.status(400).json({
        message: `This account was created with ${user.authProvider}. Please sign in with ${user.authProvider}.`,
      });
    }

    // Check lockout
    if (user.isLocked) {
      const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(429).json({
        message: `Account temporarily locked. Try again in ${minutesLeft} minute(s).`,
      });
    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      await user.incLoginAttempts();
      const attemptsLeft = 5 - (user.loginAttempts + 1);
      const msg =
        attemptsLeft > 0
          ? `Invalid email or password. ${attemptsLeft} attempt(s) remaining before lockout.`
          : 'Invalid email or password. Account locked for 30 minutes.';
      return res.status(401).json({ message: msg });
    }

    // Successful login — reset lockout, update streak
    await user.resetLoginAttempts();
    updateStreak(user);
    await user.save();

    res.json({
      user: sanitizeUser(user),
      token: generateToken(user._id),
    });
  } catch (error) {
    next(error);
  }
};

// ─── Google OAuth ─────────────────────────────────────────────────────────────

// @desc    Sign in / sign up with Google ID token
// @route   POST /api/auth/google
// @access  Public
export const googleAuth = async (req, res, next) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ message: 'Google credential is required' });
    }

    // Verify token with Google
    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch {
      return res.status(401).json({ message: 'Invalid Google credential' });
    }

    const { sub: googleId, email, name, picture } = payload;

    if (!email) {
      return res.status(400).json({ message: 'Google account must have an email' });
    }

    // Find by googleId first, then by email
    let user = await User.findOne({ googleId });

    if (!user) {
      user = await User.findOne({ email: email.toLowerCase() });

      if (user) {
        // Existing local account → link Google to it
        user.googleId = googleId;
        user.authProvider = 'google';
        if (!user.profilePic && picture) user.profilePic = picture;
      } else {
        // Brand new user
        user = new User({
          name,
          email: email.toLowerCase(),
          googleId,
          authProvider: 'google',
          profilePic: picture || '',
          streak: 1,
          lastLoginDate: new Date(),
        });
      }
    }

    updateStreak(user);
    await user.save();

    res.json({
      user: sanitizeUser(user),
      token: generateToken(user._id),
    });
  } catch (error) {
    next(error);
  }
};

// ─── Get Current User ─────────────────────────────────────────────────────────

// @desc    Get logged-in user profile (token validation)
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ user: sanitizeUser(user) });
  } catch (error) {
    next(error);
  }
};