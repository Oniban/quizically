// Routes for authentication
import express from 'express';
import { body } from 'express-validator';
import { register, login, googleAuth, getMe, logout } from '../controllers/authController.js';
import protect from '../middleware/authMiddleware.js';
import { fitsPasswordLimit, passwordLimitMessage } from '../services/passwordRules.js';

const router = express.Router();

// ─── Validation Rules ────────────────────────────────────────────────────────

const registerRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ max: 50 }).withMessage('Name cannot exceed 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/).withMessage('Name can only contain letters, spaces, hyphens and apostrophes'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email address')
    .normalizeEmail(),

  body('password')
    .isString().withMessage('Password must be a string').bail()
    .custom(fitsPasswordLimit).withMessage(passwordLimitMessage).bail()
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),
];

const loginRules = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email address')
    .normalizeEmail(),

  body('password')
    .isString().withMessage('Password must be a string').bail()
    .custom(fitsPasswordLimit).withMessage(passwordLimitMessage).bail()
    .notEmpty().withMessage('Password is required'),
];

// ─── Routes ──────────────────────────────────────────────────────────────────

router.post('/register', registerRules, register);
router.post('/login', loginRules, login);
router.post('/google', googleAuth);
router.post('/logout', logout);
router.get('/me', protect, getMe);

export default router;
