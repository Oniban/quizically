// Middleware to protect routes with JWT
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const protect = async (req, res, next) => {
  let token;

  // Get token from cookies (HttpOnly cookies)
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  if (!process.env.JWT_SECRET) {
    return next(new Error('Authentication is not configured'));
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.NotBeforeError) {
      return res.status(401).json({ message: 'Not authorized, invalid token' });
    }
    return next(error);
  }

  if (!decoded || typeof decoded.id !== 'string' || !/^[a-f\d]{24}$/i.test(decoded.id)) {
    return res.status(401).json({ message: 'Not authorized, invalid token' });
  }

  try {
    // Get user from the token
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized, user not found' });
    }

    next();
  } catch (error) {
    next(error);
  }
};

export default protect;
