import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createQuiz, quizError } from '../services/quizService';

const fieldClass = 'w-full min-w-0 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900';
const buttonClass = 'px-4 py-2 rounded-lg border border-indigo-300 text-indigo-700 dark:text-indigo-300 disabled:opacity-50';

const MakeQuiz = () => {
  const navigate = useNavigate();
  const nextId = useRef(3);
  const submitting = useRef(false);
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('');
  const [difficulty, setDifficulty] = useState('Medium');
  const [format, setFormat] = useState('MCQ');
  const [questions, setQuestions] = useState([
    { id: 0, questionText: '', options: [{ id: 1, text: '' }, { id: 2, text: '' }], correctAnswer: '', explanation: '' },
  ]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const updateQuestion = (id, changes) => {
    setQuestions((current) => current.map((question) => question.id === id ? { ...question, ...changes } : question));
  };

  const changeFormat = (value) => {
    setFormat(value);
    setQuestions((current) => current.map((question) => ({ ...question, correctAnswer: '' })));
    setError('');
  };

  const publish = async (event) => {
    event.preventDefault();
    if (submitting.current) return;
    setError('');
    if (!title.trim() || !genre.trim()) {
      setError('Enter a title and genre that are not just spaces.');
      return;
    }
    const payload = [];
    for (const [index, question] of questions.entries()) {
      const options = format === 'MCQ' ? question.options.map((option) => option.text.trim()) : format === 'True-False' ? ['True', 'False'] : [];
      const correctAnswer = format === 'MCQ'
        ? question.options.find((option) => String(option.id) === question.correctAnswer)?.text.trim()
        : question.correctAnswer.trim();
      if (!question.questionText.trim() || !correctAnswer || options.some((option) => !option)) {
        setError(`Question ${index + 1}: enter the question, all options, and a correct answer.`);
        return;
      }
      if (new Set(options.map((option) => option.toLowerCase().replace(/\s+/g, ' '))).size !== options.length) {
        setError(`Question ${index + 1}: options must be unique.`);
        return;
      }
      payload.push({ questionText: question.questionText.trim(), options, correctAnswer, explanation: question.explanation.trim() });
    }
    submitting.current = true;
    setSaving(true);
    try {
      const quiz = await createQuiz({ title: title.trim(), genre: genre.trim(), difficulty, format, questions: payload });
      navigate(`/quiz/${quiz._id}`);
    } catch (requestError) {
      setError(quizError(requestError));
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Create a New Quiz</h1>
      <form onSubmit={publish} className="bg-white dark:bg-gray-800 p-4 sm:p-8 rounded-xl shadow-md space-y-6">
        <p className="text-gray-600 dark:text-gray-300">Publish an asynchronous practice quiz with 1 to 30 questions. Every question uses the same genre, difficulty, and answer format. Live Buzzer and Pounce modes are not available yet.</p>
        <fieldset disabled={saving} className="space-y-6 min-w-0">
          <legend className="sr-only">Quiz details and questions</legend>
          <div>
            <label htmlFor="quiz-title" className="block text-sm font-medium mb-1">Quiz title</label>
            <input id="quiz-title" required maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} className={fieldClass} />
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="quiz-genre" className="block text-sm font-medium mb-1">Genre</label>
              <input id="quiz-genre" required maxLength={60} value={genre} onChange={(event) => setGenre(event.target.value)} className={fieldClass} placeholder="e.g. Literature" />
            </div>
            <div>
              <label htmlFor="quiz-difficulty" className="block text-sm font-medium mb-1">Difficulty</label>
              <select id="quiz-difficulty" value={difficulty} onChange={(event) => setDifficulty(event.target.value)} className={fieldClass}>
                {['Easy', 'Medium', 'Hard'].map((value) => <option key={value}>{value}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="quiz-format" className="block text-sm font-medium mb-1">Answer format</label>
              <select id="quiz-format" value={format} onChange={(event) => changeFormat(event.target.value)} className={fieldClass} aria-describedby="format-help">
                {['MCQ', 'True-False', 'Short Answer'].map((value) => <option key={value}>{value}</option>)}
              </select>
            </div>
          </div>
          <p id="format-help" className="text-sm text-gray-600 dark:text-gray-300">Changing format clears the selected correct answers. MCQ requires 2 to 6 unique options. Short answers use normalized exact matching, ignoring case and extra whitespace, not synonyms or alternate wording.</p>
          {questions.map((question, index) => (
            <fieldset key={question.id} className="border dark:border-gray-600 rounded-xl p-4 space-y-4 min-w-0">
              <legend className="px-2 font-bold">Question {index + 1}</legend>
              <div>
                <label htmlFor={`question-${question.id}`} className="block text-sm font-medium mb-1">Question text</label>
                <textarea id={`question-${question.id}`} required maxLength={2000} rows={3} value={question.questionText} onChange={(event) => updateQuestion(question.id, { questionText: event.target.value })} className={fieldClass} />
              </div>
              {format === 'MCQ' && (
                <div className="space-y-3">
                  {question.options.map((option, optionIndex) => (
                    <div key={option.id}>
                      <label htmlFor={`option-${option.id}`} className="block text-sm font-medium mb-1">Option {optionIndex + 1}</label>
                      <div className="flex flex-wrap sm:flex-nowrap gap-2">
                        <input id={`option-${option.id}`} required maxLength={500} value={option.text} onChange={(event) => updateQuestion(question.id, { options: question.options.map((item) => item.id === option.id ? { ...item, text: event.target.value } : item) })} className={fieldClass} />
                        <button type="button" disabled={question.options.length <= 2} aria-label={`Remove option ${optionIndex + 1} from question ${index + 1}`} className={buttonClass} onClick={() => updateQuestion(question.id, { options: question.options.filter((item) => item.id !== option.id), correctAnswer: question.correctAnswer === String(option.id) ? '' : question.correctAnswer })}>Remove</button>
                      </div>
                    </div>
                  ))}
                  <button type="button" disabled={question.options.length >= 6} className={buttonClass} onClick={() => updateQuestion(question.id, { options: [...question.options, { id: nextId.current++, text: '' }] })}>Add option</button>
                </div>
              )}
              <div>
                <label htmlFor={`answer-${question.id}`} className="block text-sm font-medium mb-1">Correct answer</label>
                {format === 'Short Answer' ? (
                  <input id={`answer-${question.id}`} required maxLength={500} value={question.correctAnswer} onChange={(event) => updateQuestion(question.id, { correctAnswer: event.target.value })} className={fieldClass} />
                ) : (
                  <select id={`answer-${question.id}`} required value={question.correctAnswer} onChange={(event) => updateQuestion(question.id, { correctAnswer: event.target.value })} className={fieldClass}>
                    <option value="">Select the correct answer</option>
                    {format === 'MCQ' ? question.options.map((option, optionIndex) => <option key={option.id} value={String(option.id)}>Option {optionIndex + 1}: {option.text}</option>) : ['True', 'False'].map((value) => <option key={value}>{value}</option>)}
                  </select>
                )}
              </div>
              <div>
                <label htmlFor={`explanation-${question.id}`} className="block text-sm font-medium mb-1">Explanation (optional)</label>
                <textarea id={`explanation-${question.id}`} maxLength={2000} rows={2} value={question.explanation} onChange={(event) => updateQuestion(question.id, { explanation: event.target.value })} className={fieldClass} />
              </div>
              <button type="button" disabled={questions.length <= 1} className={buttonClass} onClick={() => setQuestions((current) => current.filter((item) => item.id !== question.id))}>Remove question {index + 1}</button>
            </fieldset>
          ))}
          <button type="button" disabled={questions.length >= 30} className={buttonClass} onClick={() => setQuestions([...questions, { id: nextId.current++, questionText: '', options: [{ id: nextId.current++, text: '' }, { id: nextId.current++, text: '' }], correctAnswer: '', explanation: '' }])}>Add question ({questions.length}/30)</button>
        </fieldset>
        {error && <p role="alert" className="text-red-700 dark:text-red-300">{error} Your draft is preserved; correct it or retry publishing.</p>}
        <button type="submit" disabled={saving} className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50">{saving ? 'Publishing...' : 'Publish practice quiz'}</button>
        {saving && <p role="status">Saving your quiz...</p>}
      </form>
    </div>
  );
};

export default MakeQuiz;
