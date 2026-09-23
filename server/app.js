import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/authRoutes.js';
import quizRoutes from './routes/quizRoutes.js';
import errorHandler from './middleware/errorHandler.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(compression());
  const allowedOrigins = process.env.CLIENT_URL ? [process.env.CLIENT_URL] : ['http://localhost:3000', 'http://localhost:5173'];
  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(Object.assign(new Error('Origin not allowed.'), { status: 403 }));
    },
    credentials: true,
  }));
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 1000, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many requests. Please try again later.' } }));
  // A 30-question quiz can exceed 256 KiB with Unicode or JSON-escaped text.
  app.use('/api/quizzes', express.json({ limit: '2mb' }));
  app.use(express.json({ limit: '10kb' }));
  app.use(cookieParser());
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, skipSuccessfulRequests: true, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many authentication attempts. Please try again later.' } });
  app.use(['/api/auth/login', '/api/auth/register', '/api/auth/google'], authLimiter);
  app.use('/api/auth', authRoutes);
  app.use('/api/quizzes', quizRoutes);
  app.get('/', (req, res) => res.json({ message: 'Quizzically API is running.' }));
  app.use((req, res) => res.status(404).json({ message: 'Endpoint not found.' }));
  app.use(errorHandler);
  return app;
}
