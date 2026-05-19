// Service for quiz related API calls
import axios from 'axios';

const API_URL = '/api/quizzes';

export const getRecentQuiz = async () => {
  const token = localStorage.getItem('token');
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
  const response = await axios.get(`${API_URL}/recent`, config);
  return response.data;
};
