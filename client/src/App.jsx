// Main App component with routing setup
import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

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

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Router>
          <div className="min-h-screen transition-colors">
            <Navbar />
            <main className="container mx-auto px-4 py-8">
              <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                {/*
                </Routes>A 404 "Not Found" Route: Adding a catch-all route at the 
                bottom of your <Routes> ensures that if a user navigates to a URL 
                that doesn't exist, they are met with a friendly "Not Found" message 
                rather than a blank screen.
                */}
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
                </Route>
              </Routes>
            </main>
          </div>
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
