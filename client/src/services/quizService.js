import axios from 'axios';

const api = axios.create({ baseURL: '/api/quizzes', withCredentials: true });

export const getQuizzes = async (page = 1, signal) =>
  (await api.get('/', { params: { page }, signal })).data;

export const getRecentQuiz = async (signal) =>
  (await api.get('/recent', { signal })).data;

export const getQuiz = async (id, signal) =>
  (await api.get(`/${encodeURIComponent(id)}`, { signal })).data;

export const createQuiz = async (quiz) => (await api.post('/', quiz)).data;

export const submitQuiz = async (id, answers) =>
  (await api.post(`/${encodeURIComponent(id)}/submit`, { answers })).data;

export const getAttempts = async (page = 1, signal) =>
  (await api.get('/attempts', { params: { page }, signal })).data;

export const getAttempt = async (id, signal) =>
  (await api.get(`/attempts/${encodeURIComponent(id)}`, { signal })).data;

export const getPerformance = async (signal) =>
  (await api.get('/performance', { signal })).data;

export const getLeaderboard = async (genre = '', signal) =>
  (await api.get('/leaderboard', { params: genre ? { genre } : {}, signal })).data;

export const quizError = (error) => {
  if (error.response?.status === 401) return 'Your session has expired. Please sign in again.';
  const message = error.response?.data?.message;
  return typeof message === 'string' ? message : 'Unable to reach the quiz service. Please try again.';
};
