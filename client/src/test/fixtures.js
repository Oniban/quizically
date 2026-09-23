export const member = { _id: 'member-1', name: 'Ada' };

export const quiz = {
  _id: 'quiz-1',
  title: 'World capitals',
  genre: 'Geography',
  difficulty: 'Medium',
  format: 'MCQ',
  questionCount: 2,
  createdAt: '2026-09-20T12:00:00.000Z',
  questions: [
    { _id: 'question-1', questionText: 'Capital of France?', format: 'MCQ', options: ['Paris', 'Rome'] },
    { _id: 'question-2', questionText: 'Capital of Japan?', format: 'MCQ', options: ['Kyoto', 'Tokyo'] },
  ],
};

export const attempt = {
  _id: 'attempt-1',
  title: 'World capitals',
  genre: 'Geography',
  difficulty: 'Medium',
  format: 'MCQ',
  score: 1,
  total: 2,
  accuracy: 50,
  completedAt: '2026-09-21T12:00:00.000Z',
  answers: [
    { questionId: 'question-1', questionText: 'Capital of France?', answer: 'Paris', correctAnswer: 'Paris', isCorrect: true, explanation: 'Paris is the seat of the French government.' },
    { questionId: 'question-2', questionText: 'Capital of Japan?', answer: '', correctAnswer: 'Tokyo', isCorrect: false, explanation: '' },
  ],
};
