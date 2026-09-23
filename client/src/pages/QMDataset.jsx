// QM Dataset placeholder page
import React from 'react';
import { Link } from 'react-router-dom';

const QMDataset = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Quiz Master Dataset</h1>
      <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md">
        <h2 className="text-xl font-semibold mb-3">Awaiting the Quiz Master dataset</h2>
        <p className="text-gray-600 dark:text-gray-400">
          A friend is preparing the Quiz Master data. Once it is supplied and connected,
          this page will show their topics, question formats, and past sets.
          No Quiz Master profiles are available yet.
        </p>
        <Link to="/" className="inline-block mt-6 text-indigo-600 dark:text-indigo-400 underline">Browse available practice quizzes</Link>
      </div>
    </div>
  );
};

export default QMDataset;
