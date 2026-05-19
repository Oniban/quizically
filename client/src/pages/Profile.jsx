// Profile placeholder page
import React from 'react';
import useAuth from '../hooks/useAuth';

const Profile = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">User Profile</h1>
      <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md space-y-6">
        <div className="flex items-center space-x-4">
          <div className="w-24 h-24 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center text-4xl">
            {user?.name?.[0]}
          </div>
          <div>
            <h2 className="text-2xl font-bold">{user?.name}</h2>
            <p className="text-gray-500">{user?.email}</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <h3 className="text-lg font-semibold border-b pb-2">Details</h3>
          <p><strong>Bio:</strong> {user?.bio || 'No bio yet.'}</p>
          <p><strong>Streak:</strong> 🔥 {user?.streak} Days</p>
        </div>

        <div className="pt-4">
          <p className="text-gray-500 italic text-sm">
            Stats and profile editing coming soon!
          </p>
        </div>
      </div>
    </div>
  );
};

export default Profile;
