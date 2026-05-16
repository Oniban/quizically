// Auth controller for registration and login
import User from '../models/User.js';
import jwt from 'jsonwebtoken';

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      streak: 1,
      lastLoginDate: new Date(),
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        streak: user.streak,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (user && (await user.matchPassword(password))) {
      // Streak Logic
      const now = new Date();
      const lastLogin = user.lastLoginDate;
      
      if (!lastLogin) {
        user.streak = 1;
      } else {
        const diffInMs = now.setHours(0, 0, 0, 0) - new Date(lastLogin).setHours(0, 0, 0, 0);
        const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

        if (diffInDays === 1) {
          // Yesterday
          user.streak += 1;
        } else if (diffInDays > 1) {
          // 2+ days ago
          user.streak = 1;
        }
        // If diffInDays === 0 (today), do nothing to streak
      }

      user.lastLoginDate = new Date();
      await user.save();

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        streak: user.streak,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    next(error);
  }
};
