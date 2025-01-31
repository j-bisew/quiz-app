import { fetchApi } from './api';
import type { Quiz, QuizFormData } from '../components/types/quiz';

export const quizService = {
  getQuizzes: () => fetchApi<Quiz[]>('/quizzes'),

  searchQuizzes: (pattern: string) => fetchApi<Quiz[]>(`/quizzes/search?pattern=${pattern}`),

  getQuiz: (id: string) => fetchApi<Quiz>(`/quizzes/${id}`),

  createQuiz: (data: QuizFormData) => fetchApi<Quiz>('/quizzes', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  }),

  updateQuiz: (id: string, quizData: Partial<QuizFormData>) => fetchApi<Quiz>(`/quizzes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(quizData),
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  }),

  deleteQuiz: (id: string) => fetchApi(`/quizzes/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  }),

  submitQuizAnswers: (quizId: string, answers: string[][], timeSpent: number) => fetchApi<{ scorePercent: number; timeSpent: number }>(`/quizzes/${quizId}/check-answers`, {
    method: 'POST',
    body: JSON.stringify({ answers, timeSpent }),
  }).then(response => {
    console.log('Response:', response);
    return response;
  }),

  getQuizLeaderboard: (id: string) => fetchApi(`/quizzes/${id}/leaderboard`),

  getQuizComments: (id: string) => fetchApi(`/quizzes/${id}/comments`),

  addQuizComment: (id: string, text: string) => fetchApi(`/quizzes/${id}/comments`, {
    method: 'POST',
    body: JSON.stringify({ text }),
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  }),

  deleteQuizComment: (quizId: string, commentId: string) => fetchApi(`/quizzes/${quizId}/comments/${commentId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  }),

  addLeaderboardEntry: (quizId: string, score: number, timeSpent: number) => fetchApi(`/quizzes/${quizId}/leaderboard`, {
    method: 'POST',
    body: JSON.stringify({ score, timeSpent }),
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  }),
};