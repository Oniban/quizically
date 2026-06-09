// Service for quiz related API calls
import axios from 'axios';

const API_URL = '/api/quizzes';

// Configure axios to include credentials (cookies) in all requests
axios.defaults.withCredentials = true;

export const getRecentQuiz = async () => {
  const response = await axios.get(`${API_URL}/recent`);
  return response.data;
};
