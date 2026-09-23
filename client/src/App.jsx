// Main App component with routing setup
import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Loader from './components/Loader';

// Pages
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Auth/Login'));
const Signup = lazy(() => import('./pages/Auth/Signup'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const Profile = lazy(() => import('./pages/Profile'));
const MakeQuiz = lazy(() => import('./pages/MakeQuiz'));
const HotTopics = lazy(() => import('./pages/HotTopics'));
const QuestionOfDay = lazy(() => import('./pages/QuestionOfDay'));
const PastSets = lazy(() => import('./pages/PastSets'));
const QMDataset = lazy(() => import('./pages/QMDataset'));
const Performance = lazy(() => import('./pages/Performance'));
const QuizPlay = lazy(() => import('./pages/QuizPlay'));

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Router>
          <div className="min-h-screen transition-colors">
            <Navbar />
            <main className="container mx-auto px-4 py-8">
              <Suspense fallback={<Loader context="page" />}>
                <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                {/* Protected Routes */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/leaderboard" element={<Leaderboard />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/make-quiz" element={<MakeQuiz />} />
                  <Route path="/hot-topics" element={<HotTopics />} />
                  <Route path="/question-of-day" element={<QuestionOfDay />} />
                  <Route path="/past-sets" element={<PastSets />} />
                  <Route path="/qm-dataset" element={<QMDataset />} />
                  <Route path="/performance" element={<Performance />} />
                  <Route path="/quiz/:id" element={<QuizPlay />} />
                  <Route path="/attempts/:attemptId" element={<QuizPlay />} />
                </Route>
                <Route path="*" element={
                  <section className="max-w-lg mx-auto bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md text-center">
                    <p className="text-indigo-600 dark:text-indigo-400 font-semibold mb-2">404</p>
                    <h1 className="text-3xl font-bold mb-4">Page not found</h1>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">This page may have moved, or the address may be incorrect.</p>
                    <Link to="/" className="text-indigo-600 dark:text-indigo-400 underline">Back to home</Link>
                  </section>
                } />
                </Routes>
              </Suspense>
            </main>
          </div>
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
