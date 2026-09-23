import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { getAttempt, getQuiz, quizError, submitQuiz } from '../services/quizService';

const QuizSession = ({ id, attemptId }) => {
  const { refreshUser } = useAuth();
  const [quiz, setQuiz] = useState(null);
  const [result, setResult] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [refreshError, setRefreshError] = useState('');
  const [saving, setSaving] = useState(false);
  const [retry, setRetry] = useState(0);
  const submitting = useRef(false);
  const resultHeading = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    const request = attemptId ? getAttempt(attemptId, controller.signal) : getQuiz(id, controller.signal);
    request.then((data) => {
      if (!controller.signal.aborted) {
        if (attemptId) setResult(data);
        else setQuiz(data);
      }
    }).catch((requestError) => {
      if (!controller.signal.aborted) setError(quizError(requestError));
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [id, attemptId, retry]);

  useEffect(() => {
    if (result && !loading) resultHeading.current?.focus();
  }, [result, loading]);

  const submit = async (event) => {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setSaving(true);
    setSubmitError('');
    try {
      const saved = await submitQuiz(id, quiz.questions.map((question) => ({ questionId: question._id, answer: answers[question._id] || '' })));
      setResult(saved);
      // Refresh account stats independently: the saved result must remain visible on failure.
      try {
        await refreshUser();
      } catch {
        setRefreshError('Your attempt is saved, but account stats could not refresh. Reload the page to refresh them.');
      }
    } catch (requestError) {
      setSubmitError(quizError(requestError));
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  };

  if (loading) return <p role="status" className="text-center py-12">Loading {attemptId ? 'saved attempt' : 'quiz'}...</p>;
  if (error) return <div className="max-w-4xl mx-auto space-y-4"><h1 className="text-3xl font-bold">{attemptId ? 'Attempt review' : 'Practice quiz'}</h1><p role="alert">{error}</p><button onClick={() => setRetry((value) => value + 1)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg">Retry</button></div>;

  if (result) return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 ref={resultHeading} tabIndex={-1} className="text-3xl font-bold break-words">{result.title}: Saved Attempt</h1>
      <section className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4 sm:p-6 space-y-2" aria-label="Saved result">
        <p className="text-2xl font-bold">{result.score} / {result.total} correct ({result.accuracy}%)</p>
        <p>{result.genre} | {result.difficulty} | {result.format}</p>
        <p>Completed {new Date(result.completedAt).toLocaleString()}</p>
        <p className="text-sm">One saved attempt per quiz. Resubmitting returns this original result.</p>
        <Link className="text-indigo-700 dark:text-indigo-300 underline inline-block" to={`/attempts/${result._id}`}>Permanent review link</Link>
      </section>
      {refreshError && <p role="status" className="text-amber-800 dark:text-amber-200">{refreshError}</p>}
      <h2 className="text-2xl font-bold">Answer review</h2>
      {result.answers.length === 0 && <p>No answer details are available for this saved attempt.</p>}
      {result.answers.map((answer, index) => (
        <article key={answer.questionId} className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-md space-y-3 break-words">
          <h3 className="font-bold whitespace-pre-wrap">{index + 1}. {answer.questionText}</h3>
          <p className={answer.isCorrect ? 'font-semibold text-green-700 dark:text-green-300' : 'font-semibold text-red-700 dark:text-red-300'}>{answer.isCorrect ? 'Correct' : 'Incorrect'}</p>
          <p className="whitespace-pre-wrap"><strong>Your answer:</strong> {answer.answer?.trim() ? answer.answer : 'Skipped'}</p>
          <p className="whitespace-pre-wrap"><strong>Correct answer:</strong> {answer.correctAnswer}</p>
          <p className="whitespace-pre-wrap"><strong>Explanation:</strong> {answer.explanation || 'No explanation provided.'}</p>
        </article>
      ))}
      <Link to="/" className="inline-block text-indigo-700 dark:text-indigo-300 underline">Browse more quizzes</Link>
    </div>
  );

  if (!quiz) return <p>No quiz is available. <Link to="/" className="underline">Return home</Link></p>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold break-words">{quiz.title}</h1>
      <p>{quiz.genre} | {quiz.difficulty} | {quiz.format} | {quiz.questions.length} questions</p>
      {quiz.attemptId ? (
        <section className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md space-y-3">
          <p>You have already completed this quiz. Only one attempt is saved per user and quiz.</p>
          <Link to={`/attempts/${quiz.attemptId}`} className="text-indigo-700 dark:text-indigo-300 underline">Review your previous attempt</Link>
        </section>
      ) : quiz.questions.length === 0 ? <p>This quiz has no questions yet.</p> : (
        <form onSubmit={submit} className="space-y-6">
          <p className="text-gray-600 dark:text-gray-300">There is no time limit. Answers are optional; skipped questions count as incorrect. Submitting saves your only attempt for this quiz.</p>
          {quiz.format === 'Short Answer' && <p>Short answers use normalized exact matching, ignoring case and extra whitespace. Synonyms and alternate wording are not accepted.</p>}
          <fieldset disabled={saving} className="space-y-6 min-w-0">
            <legend className="sr-only">Quiz answers</legend>
            {quiz.questions.map((question, index) => (
              <fieldset key={question._id} className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-md min-w-0 space-y-3">
                <legend className="font-bold px-2 whitespace-pre-wrap break-words">{index + 1}. {question.questionText}</legend>
                {question.format === 'Short Answer' ? (
                  <div>
                    <label htmlFor={`answer-${question._id}`} className="block mb-2">Your answer (optional)</label>
                    <input id={`answer-${question._id}`} maxLength={500} value={answers[question._id] || ''} onChange={(event) => setAnswers((current) => ({ ...current, [question._id]: event.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg p-3" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {question.options.map((option, optionIndex) => (
                      <label key={option} className="flex items-start gap-3 p-3 border dark:border-gray-600 rounded-lg cursor-pointer break-words">
                        <input type="radio" name={`answer-${question._id}`} value={option} checked={answers[question._id] === option} onChange={() => setAnswers((current) => ({ ...current, [question._id]: option }))} className="mt-1 shrink-0" />
                        <span className="min-w-0 whitespace-pre-wrap">{optionIndex + 1}. {option}</span>
                      </label>
                    ))}
                    <button type="button" className="text-sm text-indigo-700 dark:text-indigo-300 underline" onClick={() => setAnswers((current) => ({ ...current, [question._id]: '' }))}>Clear answer for question {index + 1}</button>
                  </div>
                )}
              </fieldset>
            ))}
          </fieldset>
          {submitError && <p role="alert" className="text-red-700 dark:text-red-300">{submitError} Your answers are preserved. Retry submitting; if the attempt was already saved, the server returns that result.</p>}
          <button disabled={saving} type="submit" className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50">{saving ? 'Saving attempt...' : 'Submit answers'}</button>
          {saving && <p role="status">Saving your attempt...</p>}
        </form>
      )}
    </div>
  );
};

const QuizPlay = () => {
  const { id, attemptId } = useParams();
  return <QuizSession key={attemptId ? `attempt-${attemptId}` : `quiz-${id}`} id={id} attemptId={attemptId} />;
};

export default QuizPlay;
