import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAttempts, quizError } from '../services/quizService';

const PastSets = () => {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    getAttempts(page, controller.signal).then((response) => {
      if (!controller.signal.aborted) setData(response);
    }).catch((requestError) => {
      if (!controller.signal.aborted) setError(quizError(requestError));
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [page, retry]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Your Past Attempts</h1>
      <div className="bg-white dark:bg-gray-800 p-4 sm:p-8 rounded-xl shadow-md space-y-6">
        <p className="text-gray-600 dark:text-gray-300">Your personal saved practice attempts, not an imported quiz archive. Each quiz has one saved attempt; review your answers and explanations here.</p>
        {loading ? <p role="status">Loading your attempts...</p> : error ? (
          <div className="space-y-3"><p role="alert">{error}</p><button className="bg-indigo-600 text-white px-4 py-2 rounded-lg" onClick={() => setRetry((value) => value + 1)}>Retry</button></div>
        ) : data && (
          <>
            {data.attempts.length === 0 ? <p>No saved attempts on this page. <Link to="/" className="text-indigo-700 dark:text-indigo-300 underline">Browse practice quizzes</Link></p> : (
              <div className="overflow-x-auto" role="region" aria-label="Your attempts table" tabIndex={0}>
                <table className="w-full text-left">
                  <caption className="text-left font-semibold pb-4">Saved attempts, most recent first</caption>
                  <thead><tr className="border-b dark:border-gray-600">{['Quiz', 'Completed', 'Score', 'Accuracy', 'Review'].map((heading) => <th key={heading} scope="col" className="p-3">{heading}</th>)}</tr></thead>
                  <tbody>{data.attempts.map((attempt) => (
                    <tr key={attempt._id} className="border-b dark:border-gray-700">
                      <th scope="row" className="p-3 font-medium"><span className="block break-words">{attempt.title}</span><span className="text-sm font-normal text-gray-600 dark:text-gray-300">{attempt.genre} | {attempt.difficulty} | {attempt.format}</span></th>
                      <td className="p-3">{new Date(attempt.completedAt).toLocaleString()}</td>
                      <td className="p-3 whitespace-nowrap">{attempt.score} / {attempt.total}</td>
                      <td className="p-3">{attempt.accuracy}%</td>
                      <td className="p-3"><Link to={`/attempts/${attempt._id}`} className="text-indigo-700 dark:text-indigo-300 underline" aria-label={`Review ${attempt.title}`}>Review</Link></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
            {(data.pages > 1 || page > 1) && <nav aria-label="Attempt pages" className="flex flex-wrap items-center justify-between gap-3">
              <button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="px-4 py-2 border rounded-lg disabled:opacity-50">Previous</button>
              <span>Page {data.page} of {Math.max(1, data.pages)}</span>
              <button disabled={page >= data.pages} onClick={() => setPage((value) => value + 1)} className="px-4 py-2 border rounded-lg disabled:opacity-50">Next</button>
            </nav>}
          </>
        )}
      </div>
    </div>
  );
};

export default PastSets;
