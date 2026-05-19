// Main server entry point
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import quizRoutes from './routes/quizRoutes.js';
import globalErrorHandler from './middleware/errorHandler.js';

dotenv.config();

// Connect to Database
connectDB();

const app = express();

// ─── Security Middleware ──────────────────────────────────────────────────────

// Set secure HTTP headers
app.use(helmet());

// CORS — restrict to your frontend origin in production
const allowedOrigins = process.env.CLIENT_URL
  ? [process.env.CLIENT_URL]
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl in dev)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

// Body parser
app.use(express.json({ limit: '10kb' })); // Limit body size

// ─── Rate Limiting ────────────────────────────────────────────────────────────

// Global limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
});

// Stricter limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts, please try again later.' },
  skipSuccessfulRequests: true, // Don't count successful logins
});

app.use(globalLimiter);

// ─── Routes ──────────────────────────────────────────────────────────────────

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/users', (req, res) => res.json({ message: 'User route placeholder' }));
app.use('/api/leaderboard', (req, res) => res.json({ message: 'Leaderboard route placeholder' }));
app.use('/api/qm', (req, res) => res.json({ message: 'QM route placeholder' }));
app.use('/api/question-of-day', (req, res) => res.json({ message: 'Question of Day route placeholder' }));

// Root route
app.get('/', (req, res) => {
  res.send('Quizically API is running...');
});

// ─── Error Handler ────────────────────────────────────────────────────────────

app.use(globalErrorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});