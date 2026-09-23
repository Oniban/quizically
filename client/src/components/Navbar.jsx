// Navigation bar component
import React, { useContext, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { ThemeContext } from '../context/ThemeContext';
import { Moon, Sun, LogOut, User as UserIcon, Menu, X } from 'lucide-react';
import StreakBadge from './StreakBadge';

const links = [
  ['/', 'Home'],
  ['/past-sets', 'Past Attempts'],
  ['/make-quiz', 'Make Quiz'],
  ['/leaderboard', 'Leaderboard'],
  ['/performance', 'Performance'],
  ['/question-of-day', 'Question of the Day'],
  ['/hot-topics', 'Hot Topics'],
  ['/qm-dataset', 'QM Dataset'],
];

const Navbar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useContext(ThemeContext);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const menuButton = useRef(null);
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (logoutPending) return;
    setLogoutPending(true);
    setLogoutError('');
    try {
      await logout();
      setMenuOpen(false);
      navigate('/login', { replace: true });
    } catch {
      setLogoutError('Could not sign out. You are still signed in. Please try again.');
    } finally {
      setLogoutPending(false);
    }
  };

  return (
    <nav aria-label="Main navigation" className="bg-white dark:bg-gray-800 shadow-md p-4 sticky top-0 z-50 transition-colors" onKeyDown={(event) => {
      if (event.key === 'Escape' && menuOpen) {
        setMenuOpen(false);
        menuButton.current?.focus();
      }
    }}>
      <div className="container mx-auto flex flex-wrap justify-between items-center gap-3">
        <Link to="/" onClick={() => setMenuOpen(false)} className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
          Quizzically
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={toggleTheme} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            {theme === 'light' ? <Moon size={20} aria-hidden="true" /> : <Sun size={20} aria-hidden="true" />}
          </button>
          {user ? (
            <>
              <span className="hidden sm:inline-flex"><StreakBadge streak={user.streak} /></span>
              <Link to="/profile" onClick={() => setMenuOpen(false)} aria-label="Your profile" className="flex items-center gap-1 p-2 hover:text-indigo-600 dark:hover:text-indigo-400">
                <UserIcon size={20} aria-hidden="true" />
                <span className="font-medium hidden sm:inline max-w-40 truncate">{user.name}</span>
              </Link>
              <button type="button" onClick={handleLogout} disabled={logoutPending} aria-label={logoutPending ? 'Signing out' : 'Sign out'} aria-busy={logoutPending} className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full disabled:opacity-50">
                {logoutPending ? <span className="text-sm">Signing out...</span> : <LogOut size={20} aria-hidden="true" />}
              </button>
              <button ref={menuButton} type="button" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-controls="primary-links" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                {menuOpen ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="px-2 py-2 text-indigo-600 dark:text-indigo-400 font-medium">Login</Link>
              <Link to="/signup" className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">Sign Up</Link>
            </>
          )}
        </div>

        {user && (
          <div id="primary-links" className={`${menuOpen ? 'flex' : 'hidden'} md:flex w-full flex-col md:flex-row md:flex-wrap gap-1 md:gap-x-4 border-t border-gray-100 dark:border-gray-700 pt-3`}>
            {links.map(([to, label]) => (
              <NavLink key={to} to={to} end={to === '/'} onClick={() => setMenuOpen(false)} className={({ isActive }) => `rounded px-2 py-2 text-sm ${isActive ? 'text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 font-semibold' : 'hover:text-indigo-600 dark:hover:text-indigo-400'}`}>
                {label}
              </NavLink>
            ))}
          </div>
        )}
        {logoutError && <p role="alert" className="w-full text-sm text-red-600 dark:text-red-400">{logoutError}</p>}
      </div>
    </nav>
  );
};

export default Navbar;
