// Home page component
import React, { useState, useEffect } from 'react';
import useAuth from '../hooks/useAuth';
import StreakBadge from '../components/StreakBadge';
import PaintingsCarousel from '../components/PaintingsCarousel';
import { getRecentQuiz } from '../services/quizService';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Trophy, HelpCircle } from 'lucide-react';

const Home = () => {
  const { user } = useAuth();
  const [recentQuiz, setRecentQuiz] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentQuiz = async () => {
      try {
        const data = await getRecentQuiz();
        setRecentQuiz(data);
      } catch (error) {
        console.error('Error fetching recent quiz:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchRecentQuiz();
  }, []);

  return (
    <div className="space-y-12">
      {/* Welcome Section */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center bg-indigo-50 dark:bg-indigo-900/20 p-8 rounded-2xl shadow-sm border border-indigo-100 dark:border-indigo-800">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-2">
            Welcome back, <span className="text-indigo-600 dark:text-indigo-400">{user?.name}</span>!
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-lg">
            Ready to test your knowledge today?
          </p>
        </div>
        <div className="mt-4 md:mt-0">
          <StreakBadge streak={user?.streak} />
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
            <Trophy className="mr-2 text-yellow-500" /> Most Recent Quiz
          </h2>
          {loading ? (
            <p className="text-gray-500 italic">Loading...</p>
          ) : recentQuiz ? (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <h3 className="font-bold text-lg">{recentQuiz.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Genre: {recentQuiz.genre} | Difficulty: {recentQuiz.difficulty}
                </p>
              </div>
              <Link to={`/quiz/${recentQuiz._id}`} className="inline-flex items-center text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
                Replay Quiz <ArrowRight size={16} className="ml-1" />
              </Link>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-gray-500 dark:text-gray-400 mb-4">You haven't taken any quizzes yet!</p>
              <Link to="/make-quiz" className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors inline-block">
                Start your first quiz
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
            Challenge yourself with our daily curated question and get AI-powered insights on how to arrive at the answer.
          </p>
          <Link to="/question-of-day" className="bg-white text-indigo-600 px-6 py-2 rounded-lg font-bold hover:bg-gray-100 transition-colors inline-block">
            View Today's Question
          </Link>
        </section>
      </div>
    </div>
  );
};

export default Home;
