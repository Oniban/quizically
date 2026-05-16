// Main App component with routing setup
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Home from './pages/Home';
import Login from './pages/Auth/Login';
import Signup from './pages/Auth/Signup';
import Leaderboard from './pages/Leaderboard';
import Profile from './pages/Profile';
import MakeQuiz from './pages/MakeQuiz';
import HotTopics from './pages/HotTopics';
import QuestionOfDay from './pages/QuestionOfDay';
import PastSets from './pages/PastSets';
import QMDataset from './pages/QMDataset';
import Performance from './pages/Performance';

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
