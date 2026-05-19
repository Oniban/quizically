// Navigation bar component
import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { ThemeContext } from '../context/ThemeContext';
import { Moon, Sun, LogOut, User as UserIcon } from 'lucide-react';
import StreakBadge from './StreakBadge';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-md p-4 sticky top-0 z-50 transition-colors">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
          Quizzically
        </Link>

        <div className="hidden md:flex space-x-6 items-center">
          {user && (
            <>
              <Link to="/leaderboard" className="hover:text-indigo-600 dark:hover:text-indigo-400">Leaderboard</Link>
              <Link to="/past-sets" className="hover:text-indigo-600 dark:hover:text-indigo-400">Past Sets</Link>
              <Link to="/make-quiz" className="hover:text-indigo-600 dark:hover:text-indigo-400">Make Quiz</Link>
            </>
          )}
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>

          {user ? (
            <div className="flex items-center space-x-4">
              <StreakBadge streak={user.streak} />
              <div className="flex items-center space-x-2">
                <Link to="/profile" className="flex items-center space-x-1 hover:text-indigo-600 dark:hover:text-indigo-400">
                  <UserIcon size={20} />
                  <span className="font-medium hidden sm:inline">{user.name}</span>
                </Link>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                title="Logout"
              >
                <LogOut size={20} />
              </button>
            </div>
          ) : (
            <div className="space-x-2">
              <Link to="/login" className="px-4 py-2 text-indigo-600 dark:text-indigo-400 font-medium">Login</Link>
              <Link to="/signup" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">Sign Up</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
