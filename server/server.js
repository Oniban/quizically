// Main server entry point
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import quizRoutes from './routes/quizRoutes.js';
import globalErrorHandler from './middleware/errorHandler.js';

dotenv.config();

// Connect to Database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/users', (req, res) => res.json({ message: 'User route placeholder' }));
app.use('/api/leaderboard', (req, res) => res.json({ message: 'Leaderboard route placeholder' }));
app.use('/api/qm', (req, res) => res.json({ message: 'QM route placeholder' }));
app.use('/api/question-of-day', (req, res) => res.json({ message: 'Question of Day route placeholder' }));

// Root route
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Error Handler
app.use(globalErrorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
