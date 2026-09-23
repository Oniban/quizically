// Home page component
import React, { useState, useEffect } from 'react';
import useAuth from '../hooks/useAuth';
import PaintingsCarousel from '../components/PaintingsCarousel';
import { getQuizzes, getRecentQuiz, quizError } from '../services/quizService';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Trophy, HelpCircle } from 'lucide-react';

const Home = () => {
  const { user } = useAuth();
  const [recentQuiz, setRecentQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentError, setRecentError] = useState('');
  const [recentRetry, setRecentRetry] = useState(0);
  const [catalogue, setCatalogue] = useState(null);
  const [page, setPage] = useState(1);
  const [catalogueLoading, setCatalogueLoading] = useState(true);
  const [catalogueError, setCatalogueError] = useState('');
  const [catalogueRetry, setCatalogueRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setRecentError('');
    getRecentQuiz(controller.signal).then((data) => {
      if (!controller.signal.aborted) setRecentQuiz(data);
    }).catch((error) => {
      if (!controller.signal.aborted) setRecentError(quizError(error));
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [recentRetry]);

  useEffect(() => {
    const controller = new AbortController();
    setCatalogueLoading(true);
    setCatalogueError('');
    getQuizzes(page, controller.signal).then((data) => {
      if (!controller.signal.aborted) setCatalogue(data);
    }).catch((error) => {
      if (!controller.signal.aborted) setCatalogueError(quizError(error));
    }).finally(() => {
      if (!controller.signal.aborted) setCatalogueLoading(false);
    });
    return () => controller.abort();
  }, [page, catalogueRetry]);

  return (
    <div className="space-y-12">
      {/* Welcome Section */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center bg-indigo-50 dark:bg-indigo-900/20 p-4 sm:p-8 rounded-2xl shadow-sm border border-indigo-100 dark:border-indigo-800">
        <div className="min-w-0">
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-2">
            Welcome back, <span className="text-indigo-600 dark:text-indigo-400 break-words">{user?.name}</span>!
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-lg">
            Ready to test your knowledge today?
          </p>
        </div>
      </section>

      {/* Paintings Carousel */}
      <section>
        <h2 className="text-2xl font-bold mb-6 flex items-center">
          <BookOpen className="mr-2 text-indigo-600" /> Famous Art Appreciation
        </h2>
        <PaintingsCarousel />
      </section>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Most Recent Quiz */}
        <section className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <Trophy className="mr-2 text-yellow-500" /> Most Recent Saved Attempt
          </h2>
          {loading ? (
            <p role="status" className="text-gray-500 italic">Loading recent attempt...</p>
          ) : recentError ? (
            <div className="space-y-3"><p role="alert">{recentError}</p><button onClick={() => setRecentRetry((value) => value + 1)} className="text-indigo-700 dark:text-indigo-300 underline">Retry recent attempt</button></div>
          ) : recentQuiz ? (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <h3 className="font-bold text-lg break-words">{recentQuiz.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {recentQuiz.genre} | {recentQuiz.difficulty} | {recentQuiz.format}
                </p>
                <p className="font-semibold mt-2">{recentQuiz.score} / {recentQuiz.total} correct ({recentQuiz.accuracy}%)</p>
                <p className="text-sm">Completed {new Date(recentQuiz.completedAt).toLocaleString()}</p>
              </div>
              <Link to={`/attempts/${recentQuiz._id}`} className="inline-flex items-center text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
                Review saved attempt <ArrowRight size={16} className="ml-1" />
              </Link>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-gray-500 dark:text-gray-400 mb-4">You haven't taken any quizzes yet!</p>
              <Link to="/make-quiz" className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors inline-block">
                Create your first quiz
              </Link>
            </div>
          )}
        </section>

        {/* Question of the Day Teaser */}
        <section className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 rounded-2xl shadow-lg text-white">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <HelpCircle className="mr-2 text-white" /> Question of the Day
          </h2>
          <p className="opacity-90 mb-6">
            Daily questions and AI explanations are planned. Provider setup is still pending; published practice quizzes are available below.
          </p>
          <Link to="/question-of-day" className="bg-white text-indigo-600 px-6 py-2 rounded-lg font-bold hover:bg-gray-100 transition-colors inline-block">
            View QOTD Status
          </Link>
        </section>
      </div>
      <section aria-labelledby="catalogue-heading" className="space-y-6">
        <h2 id="catalogue-heading" className="text-2xl font-bold">Published Practice Quizzes</h2>
        {catalogueLoading ? <p role="status">Loading quizzes...</p> : catalogueError ? (
          <div className="space-y-3"><p role="alert">{catalogueError}</p><button onClick={() => setCatalogueRetry((value) => value + 1)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg">Retry quizzes</button></div>
        ) : catalogue && (
          <>
            {catalogue.quizzes.length === 0 ? <p>No published quizzes on this page. <Link to="/make-quiz" className="text-indigo-700 dark:text-indigo-300 underline">Create a practice quiz</Link>.</p> : (
              <ul className="grid md:grid-cols-2 gap-6">
                {catalogue.quizzes.map((quiz) => (
                  <li key={quiz._id} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 space-y-3 min-w-0 break-words">
                    <h3 className="text-xl font-bold"><Link to={`/quiz/${quiz._id}`} className="text-indigo-700 dark:text-indigo-300 hover:underline">{quiz.title}</Link></h3>
                    <p>{quiz.genre} | {quiz.difficulty} | {quiz.format}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{quiz.questionCount} questions | Published {new Date(quiz.createdAt).toLocaleDateString()}</p>
                    <Link to={`/quiz/${quiz._id}`} className="inline-flex items-center text-indigo-700 dark:text-indigo-300 font-medium hover:underline" aria-label={`Open quiz: ${quiz.title}`}>Open quiz <ArrowRight size={16} className="ml-1" /></Link>
                  </li>
                ))}
              </ul>
            )}
            {(catalogue.pages > 1 || page > 1) && <nav aria-label="Quiz catalogue pages" className="flex flex-wrap justify-between items-center gap-3">
              <button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="px-4 py-2 border rounded-lg disabled:opacity-50">Previous</button>
              <span>Page {catalogue.page} of {Math.max(1, catalogue.pages)}</span>
              <button disabled={page >= catalogue.pages} onClick={() => setPage((value) => value + 1)} className="px-4 py-2 border rounded-lg disabled:opacity-50">Next</button>
            </nav>}
          </>
        )}
      </section>
    </div>
  );
};

export default Home;
