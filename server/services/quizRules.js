export const difficulties = ['Easy', 'Medium', 'Hard'];
export const formats = ['MCQ', 'Short Answer', 'True-False'];

export const invalid = (message, status = 422) => Object.assign(new Error(message), { status });

export const normalizeAnswer = (answer) => answer.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLowerCase();

function text(value, label, max, optional = false) {
  if (optional && value === undefined) return '';
  if (typeof value !== 'string' || (!optional && !value.trim()) || value.length > max) {
    throw invalid(`${label} must be ${optional ? 'at most' : 'between 1 and'} ${max} characters.`);
  }
  return value.trim();
}

export function validateQuiz(body) {
  if (!body || typeof body !== 'object') throw invalid('A quiz is required.');
  const title = text(body.title, 'Title', 120);
  const genre = text(body.genre, 'Genre', 60);
  const { difficulty, format } = body;
  if (!difficulties.includes(difficulty)) throw invalid('Choose Easy, Medium, or Hard.');
  if (!formats.includes(format)) throw invalid('Choose MCQ, Short Answer, or True-False.');
  if (!Array.isArray(body.questions) || body.questions.length < 1 || body.questions.length > 30) {
    throw invalid('A quiz must have between 1 and 30 questions.');
  }
  const questions = body.questions.map((question, index) => {
    if (!question || typeof question !== 'object') throw invalid(`Question ${index + 1} is invalid.`);
    const questionText = text(question.questionText, `Question ${index + 1}`, 2000);
    const correctAnswer = text(question.correctAnswer, 'Correct answer', 500);
    const explanation = text(question.explanation, 'Explanation', 2000, true);
    let options = [];
    if (format === 'True-False') options = ['True', 'False'];
    if (format === 'MCQ') {
      if (!Array.isArray(question.options) || question.options.length < 2 || question.options.length > 6) {
        throw invalid(`Question ${index + 1} needs 2 to 6 options.`);
      }
      options = question.options.map((option) => text(option, 'Option', 500));
      if (new Set(options.map(normalizeAnswer)).size !== options.length) throw invalid('Options must be unique.');
    }
    if (options.length && !options.includes(correctAnswer)) throw invalid('The correct answer must match an option.');
    return { questionText, correctAnswer, explanation, options, genre, difficulty, format };
  });
  return { title, genre, difficulty, format, questions };
}

export function scoreQuiz(quiz, submitted) {
  if (!Array.isArray(submitted) || submitted.length > quiz.questions.length) throw invalid('Invalid answer list.');
  const questionIds = new Set(quiz.questions.map((question) => String(question._id)));
  const answersById = new Map();
  for (const entry of submitted) {
    if (!entry || typeof entry.questionId !== 'string' || !questionIds.has(entry.questionId) || answersById.has(entry.questionId)) {
      throw invalid('Answers must refer to distinct questions in this quiz.');
    }
    answersById.set(entry.questionId, text(entry.answer, 'Answer', 500, true));
  }
  const answers = quiz.questions.map((question) => {
    const answer = answersById.get(String(question._id)) || '';
    const format = question.format || quiz.format;
    if (answer && format !== 'Short Answer' && !question.options.includes(answer)) throw invalid('Select a listed answer option.');
    return {
      questionId: question._id,
      questionText: question.questionText,
      answer,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation || '',
      isCorrect: Boolean(answer) && normalizeAnswer(answer) === normalizeAnswer(question.correctAnswer),
      genre: question.genre || quiz.genre,
      difficulty: question.difficulty || quiz.difficulty,
      format,
    };
  });
  const score = answers.filter((answer) => answer.isCorrect).length;
  const total = answers.length;
  return { answers, score, total, accuracy: total ? Math.round(score * 100 / total) : 0 };
}

export function calculateStreak(days, now = new Date()) {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const dates = [...new Set(days.map((day) => new Date(day).getTime()))].filter((day) => day <= today).sort((a, b) => b - a);
  if (!dates.length || today - dates[0] > 86400000) return 0;
  let streak = 1;
  while (streak < dates.length && dates[streak - 1] - dates[streak] === 86400000) streak += 1;
  return streak;
}
