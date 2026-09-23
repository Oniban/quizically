// Question of the Day placeholder page
import React from 'react';
import { Link } from 'react-router-dom';

const QuestionOfDay = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Question of the Day</h1>
      <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md space-y-6">
        <div className="p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border-l-4 border-indigo-600">
          <h2 className="text-xl font-semibold mb-2">Daily questions are not available yet</h2>
          <p className="text-gray-600 dark:text-gray-400">A daily question source has not been connected. No question is scheduled here today.</p>
        </div>
        
        <div className="space-y-4">
          <h2 className="text-xl font-bold">AI Explanation</h2>
          <p className="text-gray-600 dark:text-gray-400">
            AI explanations are planned, but the AI provider is not configured yet.
            No explanation has been generated, and this page is not waiting for a response.
          </p>
          <Link to="/" className="inline-block text-indigo-600 dark:text-indigo-400 underline">Find a practice quiz</Link>
        </div>
      </div>
    </div>
  );
};

export default QuestionOfDay;
