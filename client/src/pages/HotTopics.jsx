// Hot Topics placeholder page
import React from 'react';
import { Link } from 'react-router-dom';

const HotTopics = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Hot Topics</h1>
      <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md">
        <h2 className="text-xl font-semibold mb-3">News feed not connected yet</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Current events and quiz-relevant news will appear here once a news provider is configured.
          There are no live headlines to show yet; this page is not loading a feed.
        </p>
        <Link to="/" className="inline-block mt-6 text-indigo-600 dark:text-indigo-400 underline">Explore practice quizzes instead</Link>
      </div>
    </div>
  );
};

export default HotTopics;
