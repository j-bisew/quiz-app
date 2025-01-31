'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { io } from 'socket.io-client';
import type { Quiz } from '../types/quiz';
import { mqttClient } from '@/app/services/mqtt';

const WEBSOCKET_URL = 'http://localhost:5000';

interface QuizListProps {
  quizzes: Quiz[];
  onDeleteQuiz: (quizId: string) => void;
  canDeleteQuiz: (quiz: Quiz) => boolean;
  setQuizzes: (quizzes: Quiz[]) => void;
}

const QuizList: React.FC<QuizListProps> = ({ quizzes, onDeleteQuiz, canDeleteQuiz, setQuizzes }) => {
  const router = useRouter();

  useEffect(() => {
    
    mqttClient.on('connect', () => {
      console.log('Connected to MQTT broker in QuizList');
      mqttClient.subscribe('quizzes/updates');
    });

    mqttClient.on('message', (topic, message) => {
      console.log('Received MQTT message:', topic, message.toString());
      if (topic === 'quizzes/updates') {
        const update = JSON.parse(message.toString());
        handleQuizUpdate(update);
      }
    });

    const socket = io(WEBSOCKET_URL);
    
    socket.on('connect', () => {
      console.log('Connected to Socket.IO server in QuizList');
    });

    socket.on('quizUpdate', (update) => {
      console.log('Received Socket.IO update:', update);
      handleQuizUpdate(update);
    });

    return () => {
      mqttClient.unsubscribe('quizzes/updates');
      socket.disconnect();
    };
  }, []);

  const handleQuizUpdate = (update: any) => {
    console.log('Handling quiz update:', update);
    
    if (update.type === 'created') {
      setQuizzes([...quizzes, update.quiz]);
    } else if (update.type === 'updated') {
      setQuizzes(quizzes.map(quiz => 
        quiz.id === update.quiz.id ? update.quiz : quiz
      ));
    } else if (update.type === 'deleted') {
      setQuizzes(quizzes.filter(quiz => quiz.id !== update.quizId));
    }
  };

  const handleStartQuiz = (quizId: string) => {
    router.push(`/quizzes/${quizId}`);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 m-4">
      {quizzes.map((quiz) => (
        <div key={quiz.id} className="bg-gray-800 shadow rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-2 text-white">{quiz.title}</h3>
          <p className="mb-4 text-gray-300">{quiz.description}</p>
          <div className="grid grid-cols-2 gap-4 text-sm mb-6">
            <div>
              <p className="text-gray-500">Category</p>
              <p className="text-gray-300">{quiz.category}</p>
            </div>
            <div>
              <p className="text-gray-500">Difficulty</p>
              <p className="text-gray-300">{quiz.difficulty}</p>
            </div>
            <div>
              <p className="text-gray-500">Questions</p>
              <p className="text-gray-300">{quiz.questions.length}</p>
            </div>
            <div>
              <p className="text-gray-500">Time Limit</p>
              <p className="text-gray-300">{quiz.timeLimit ? `${quiz.timeLimit} sec` : 'No time limit'}</p>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-gray-500">by {quiz.createdBy?.name || 'Anonymous'}</p>
            <div>
              {canDeleteQuiz(quiz) && (
                <button
                  onClick={() => onDeleteQuiz(quiz.id)}
                  className="px-4 py-2 mr-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Delete
                </button>
              )}
              <button
                onClick={() => handleStartQuiz(quiz.id)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Start Quiz
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default QuizList;