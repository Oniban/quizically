// Leaderboard placeholder page
import React, { useState, useEffect } from 'react';
import Loader from '../components/Loader';

const Leaderboard = () => {
  const [isLoading, setIsLoading] = useState(true);

  // useEffect(() => {
  //   // Simulate 10 second loading time
  //   const timer = setTimeout(() => {
  //     setIsLoading(false);
  //   }, 10000);

  //   return () => clearTimeout(timer);
  // }, []);

  // if (isLoading) {
  //   return <Loader size="lg" />;
  // }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="mb-6 text-3xl font-bold">Leaderboard</h1>
      <div className="p-8 text-center bg-white shadow-md dark:bg-gray-800 rounded-xl">
        <p className="mb-4 text-2xl font-semibold text-indigo-600">Coming Soon!</p>
        <p className="text-gray-600 dark:text-gray-400">
          The leaderboard will feature rankings across different genres, difficulty levels, and quiz formats. 
          Compete with your fellow quiz club members and rise to the top!
        </p>
      </div>
    </div>
  );
};

export default Leaderboard;
