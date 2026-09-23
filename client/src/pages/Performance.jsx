import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { getPerformance, quizError } from '../services/quizService';
import Loader from '../components/Loader';

const Performance = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    getPerformance(controller.signal).then((response) => {
      if (!controller.signal.aborted) setData(response);
    }).catch((requestError) => {
      if (!controller.signal.aborted) setError(quizError(requestError));
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [retry]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Your Performance</h1>
      <p className="text-gray-600 dark:text-gray-300">Results from your saved attempts, including skipped questions as incorrect.</p>
      {loading ? <Loader context="stats" message="Loading performance..." /> : error ? (
        <div className="space-y-3"><p role="alert">{error}</p><button className="bg-indigo-600 text-white px-4 py-2 rounded-lg" onClick={() => setRetry((value) => value + 1)}>Retry</button></div>
      ) : data && (data.totalQuizzes === 0 ? (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">No saved attempts yet. <Link to="/" className="text-indigo-700 dark:text-indigo-300 underline">Find a quiz to get started</Link>.</div>
      ) : (
        <>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[['Quizzes completed', data.totalQuizzes], ['Total questions', data.totalQuestions], ['Correct answers', data.correctAnswers], ['Accuracy', `${data.accuracy}%`]].map(([label, value]) => (
              <div key={label} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md"><dt className="text-sm text-gray-600 dark:text-gray-300">{label}</dt><dd className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">{value}</dd></div>
            ))}
          </dl>
          {[['Genre', 'byGenre'], ['Difficulty', 'byDifficulty'], ['Format', 'byFormat']].map(([label, key]) => (
            <section key={key} aria-labelledby={`heading-${key}`} className="bg-white dark:bg-gray-800 p-4 sm:p-8 rounded-xl shadow-md space-y-4">
              <h2 id={`heading-${key}`} className="text-xl font-bold">By {label.toLowerCase()}</h2>
              {data[key].length === 0 ? <p>No {label.toLowerCase()} results yet.</p> : (
                <>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Accuracy as a percentage. All chart values are also listed in the table below.</p>
                  <div className="h-80 w-full min-w-0" aria-hidden="true">
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart data={data[key]} accessibilityLayer={false}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis domain={[0, 100]} unit="%" width={45} />
                        <Tooltip formatter={(value) => [`${value}%`, 'Accuracy']} />
                        <Bar dataKey="accuracy" name="Accuracy" fill="#6366f1" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="overflow-x-auto" role="region" aria-label={`${label} performance table`} tabIndex={0}>
                    <table className="w-full text-left">
                      <caption className="text-left font-semibold pb-2">Performance by {label.toLowerCase()}</caption>
                      <thead><tr className="border-b dark:border-gray-600">{[label, 'Correct', 'Total', 'Accuracy'].map((heading) => <th key={heading} scope="col" className="p-3">{heading}</th>)}</tr></thead>
                      <tbody>{data[key].map((row) => <tr key={row.name} className="border-b dark:border-gray-700"><th scope="row" className="p-3 font-medium break-words">{row.name}</th><td className="p-3">{row.correct}</td><td className="p-3">{row.total}</td><td className="p-3">{row.accuracy}%</td></tr>)}</tbody>
                    </table>
                  </div>
                </>
              )}
            </section>
          ))}
        </>
      ))}
    </div>
  );
};

export default Performance;
