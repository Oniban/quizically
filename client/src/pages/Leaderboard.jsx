import React, { useEffect, useState } from 'react';
import { getLeaderboard, quizError } from '../services/quizService';
import Loader from '../components/Loader';

const Leaderboard = () => {
  const [data, setData] = useState(null);
  const [genre, setGenre] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    getLeaderboard(genre, controller.signal).then((response) => {
      if (!controller.signal.aborted) setData(response);
    }).catch((requestError) => {
      if (!controller.signal.aborted) setError(quizError(requestError));
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [genre, retry]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Leaderboard</h1>
      <div className="p-4 sm:p-8 bg-white shadow-md dark:bg-gray-800 rounded-xl space-y-6">
        <p className="text-gray-600 dark:text-gray-300">Ranked by total correct answers, then accuracy. Only one saved attempt per quiz counts. Attempts on quizzes you authored are excluded from your leaderboard score.</p>
        <div>
          <label htmlFor="leaderboard-genre" className="block font-medium mb-2">Filter by genre</label>
          <select id="leaderboard-genre" value={genre} onChange={(event) => setGenre(event.target.value)} className="w-full sm:w-auto sm:max-w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900">
            <option value="">All genres</option>
            {genre && !data?.genres.includes(genre) && <option value={genre}>{genre}</option>}
            {data?.genres.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </div>
        {loading ? <Loader context="stats" message="Loading rankings..." /> : error ? (
          <div className="space-y-3"><p role="alert">{error}</p><button className="bg-indigo-600 text-white px-4 py-2 rounded-lg" onClick={() => setRetry((value) => value + 1)}>Retry</button></div>
        ) : data && (data.entries.length === 0 ? <p>No eligible attempts {genre ? `for ${genre}` : 'yet'}. Complete a quiz written by another member to participate.</p> : (
          <div className="overflow-x-auto" role="region" aria-label="Leaderboard table" tabIndex={0}>
            <table className="w-full text-left">
              <caption className="text-left font-semibold pb-4">{genre || 'All genres'} rankings</caption>
              <thead><tr className="border-b dark:border-gray-600">{['Rank', 'Member', 'Correct', 'Total questions', 'Quizzes', 'Accuracy'].map((heading) => <th key={heading} scope="col" className="p-3">{heading}</th>)}</tr></thead>
              <tbody>{data.entries.map((entry) => (
                <tr key={entry.userId} className="border-b dark:border-gray-700"><td className="p-3 font-bold text-indigo-700 dark:text-indigo-300">{entry.rank}</td><th scope="row" className="p-3 font-medium break-words">{entry.name}</th><td className="p-3">{entry.correct}</td><td className="p-3">{entry.total}</td><td className="p-3">{entry.quizzes}</td><td className="p-3">{entry.accuracy}%</td></tr>
              ))}</tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Leaderboard;
