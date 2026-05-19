// Past Sets placeholder page
import React from 'react';

const PastSets = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Past Quiz Sets</h1>
      <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md">
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Review your previous performances and re-take old quizzes to improve your score.
        </p>
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="p-4 border dark:border-gray-700 rounded-lg flex justify-between items-center">
              <div>
                <h3 className="font-bold">Sample Quiz {i}</h3>
                <p className="text-sm text-gray-500">Taken on: April {10 + i}, 2026</p>
              </div>
              <span className="text-indigo-600 font-bold">Score: {80 + i}/100</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PastSets;
