// QM Dataset placeholder page
import React from 'react';

const QMDataset = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Quiz Master Dataset</h1>
      <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md">
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Click on a Quiz Master to see their preferred topics, question formats, and past sets. 
          Understand their style to better prepare for their rounds.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {['QM John', 'QM Sarah', 'QM David'].map(qm => (
            <div key={qm} className="p-6 bg-gray-50 dark:bg-gray-700 rounded-xl text-center hover:shadow-lg transition-shadow cursor-pointer">
              <div className="w-16 h-16 bg-indigo-200 dark:bg-indigo-900 rounded-full mx-auto mb-4"></div>
              <h3 className="font-bold">{qm}</h3>
              <p className="text-xs text-gray-500 mt-2">Preferred: Business, Sci-Tech</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default QMDataset;
