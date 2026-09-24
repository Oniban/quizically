// Auth controller — register, login, Google OAuth, getMe
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import { OAuth2Client } from 'google-auth-library';
import { getActivityStats } from '../services/quizStats.js';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

const authCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/',
});

const setAuthCookie = (res, token) => {
  res.cookie('token', token, {
    ...authCookieOptions(),
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
  });
};

const sanitizeUser = async (user) => {
  const { streak, totalQuizzes } = await getActivityStats(user._id);
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    bio: user.bio,
    streak,
    totalQuizzes,
    profilePic: user.profilePic,
    authProvider: user.authProvider,
  };
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
      lastLoginDate: new Date(),
      authProvider: 'local',
    });

    const safeUser = await sanitizeUser(user);
    const token = generateToken(user._id);
    setAuthCookie(res, token);

    res.status(201).json({
      user: safeUser,
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
    if (!user.password) {
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
      const updated = await user.incLoginAttempts();
      const attemptsLeft = Math.max(0, 5 - updated.loginAttempts);
      const msg =
        attemptsLeft > 0
          ? `Invalid email or password. ${attemptsLeft} attempt(s) remaining before lockout.`
          : 'Invalid email or password. Account locked for 30 minutes.';
      return res.status(401).json({ message: msg });
    }

    // Successful login updates access time, not quiz activity.
    if (!await user.resetLoginAttempts()) {
      return res.status(429).json({ message: 'Account temporarily locked. Please try again later.' });
    }

    const safeUser = await sanitizeUser(user);
    const token = generateToken(user._id);
    setAuthCookie(res, token);

    res.json({
      user: safeUser,
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
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(503).json({ message: 'Google sign-in is not configured' });
    }

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

    const { sub: googleId, email, email_verified, name, picture } = payload || {};

    if (!googleId || !email || email_verified !== true) {
      return res.status(401).json({ message: 'Google account must have a verified email' });
    }

    // Never link an unverified password account just because its email matches.
    let user = await User.findOne({ googleId });

    if (!user) {
      user = await User.findOne({ email: email.toLowerCase() });

      if (user) {
        return res.status(409).json({ message: 'An account with this email already exists. Use its original sign-in method. Automatic account linking is not supported.' });
      } else {
        // Brand new user
        user = new User({
          name,
          email: email.toLowerCase(),
          googleId,
          authProvider: 'google',
          profilePic: picture || '',
          lastLoginDate: new Date(),
        });
      }
    }

    user.lastLoginDate = new Date();
    await user.save();

    const safeUser = await sanitizeUser(user);
    const token = generateToken(user._id);
    setAuthCookie(res, token);

    res.json({
      user: safeUser,
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
      return res.status(401).json({ message: 'Not authorized, user not found' });
    }
    res.json({ user: await sanitizeUser(user) });
  } catch (error) {
    next(error);
  }
};

// Clearing an expired or missing session is also a successful logout.
export const logout = (req, res) => {
  res.clearCookie('token', authCookieOptions());
  res.status(204).end();
};
