// Profile and completed quiz activity
import React from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

const Profile = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">User Profile</h1>
      <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md space-y-6">
        <div className="flex flex-wrap items-center gap-4">
          <div aria-hidden="true" className="w-24 h-24 shrink-0 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center text-4xl">
            {user?.name?.[0]}
          </div>
          <div className="min-w-0 break-words">
            <h2 className="text-2xl font-bold">{user?.name}</h2>
            <p className="text-gray-500">{user?.email}</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <h3 className="text-lg font-semibold border-b pb-2">Details</h3>
          <p><strong>Bio:</strong> {user?.bio || 'No bio yet.'}</p>
          <p><strong>Quiz streak:</strong> {user?.streak ?? 0} days</p>
          <p><strong>Completed quizzes:</strong> {user?.totalQuizzes ?? 0}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Streaks count consecutive days with a completed quiz, using UTC dates.</p>
        </div>

        <div className="pt-4">
          <div className="flex flex-wrap gap-4">
            <Link to="/performance" className="text-indigo-600 dark:text-indigo-400 font-medium underline">View your stats</Link>
            <Link to="/past-sets" className="text-indigo-600 dark:text-indigo-400 font-medium underline">View attempt history</Link>
          </div>
          <p className="text-gray-500 dark:text-gray-400 italic text-sm mt-3">Profile editing is not available yet.</p>
        </div>
      </div>
    </div>
  );
};

export default Profile;
