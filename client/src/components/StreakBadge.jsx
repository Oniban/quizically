// Component to display user's daily streak
import React from 'react';

const StreakBadge = ({ streak }) => {
  return (
    <div className="flex items-center bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-3 py-1 rounded-full font-bold text-sm">
      <span className="mr-1">🔥</span>
      <span>{streak || 0} Day Streak</span>
    </div>
  );
};

export default StreakBadge;
