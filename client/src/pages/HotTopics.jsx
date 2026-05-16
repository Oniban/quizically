// Hot Topics placeholder page
import React from 'react';

const HotTopics = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Hot Topics</h1>
      <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md">
        <p className="text-gray-600 dark:text-gray-400">
          This page will show current events and trending topics relevant to the quizzing world. 
          Stay updated with what's happening to ace those "Infinite Pounce" rounds!
        </p>
        <div className="mt-8 grid gap-4">
          <div className="h-20 bg-gray-100 dark:bg-gray-700 animate-pulse rounded-lg"></div>
          <div className="h-20 bg-gray-100 dark:bg-gray-700 animate-pulse rounded-lg"></div>
          <div className="h-20 bg-gray-100 dark:bg-gray-700 animate-pulse rounded-lg"></div>
        </div>
      </div>
    </div>
  );
};

export default HotTopics;
