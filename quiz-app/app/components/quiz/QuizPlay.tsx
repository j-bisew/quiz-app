'use client';

import { useState, useEffect } from 'react';
import { quizService } from '../../services/quiz';
import type { Quiz } from '../../components/types/quiz';
import QuizResultPage from './QuizResult';

interface QuizPlayPageProps {
  id: string;
}

export default function QuizPlayPage({ id }: QuizPlayPageProps) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<string[][]>([]);
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [timeSpent, setTimeSpent] = useState(0);
  const [timerIntervalId, setTimerIntervalId] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        if (id) {
          const data = await quizService.getQuiz(id);
          console.log('Quiz data:', data);
          if (data.error) {
            setError(data.error);
          } else if (data.data) {
            setQuiz(data.data);
            setSelectedAnswers(new Array(data.data.questions.length).fill([]));
            if (data.data.timeLimit) {
              setTimeRemaining(data.data.timeLimit);
            }
          }
        }
      } catch (error) {
        setError('Failed to fetch quiz');
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuiz();

    const intervalId = setInterval(() => {
      setTimeSpent((prevTime) => prevTime + 1);
      setTimeRemaining((prevTime) => {
        if (prevTime !== null && prevTime > 0) {
          return prevTime - 1;
        } else if (prevTime === 0) {
          handleQuizSubmit();
        }
        return prevTime;
      });
    }, 1000);
    setTimerIntervalId(intervalId);

    return () => {
      if (timerIntervalId) {
        clearInterval(timerIntervalId);
      }
      clearInterval(intervalId);
    };
  }, [id]);

  const handleAnswerSelect = (questionIndex: number, answer: string) => {
    const updatedSelectedAnswers = [...selectedAnswers];

    if (quiz?.questions[questionIndex].type === 'OPEN' || quiz?.questions[questionIndex].type === 'SINGLE') {
      updatedSelectedAnswers[questionIndex] = [answer];
    } else {
      if (updatedSelectedAnswers[questionIndex].includes(answer)) {
        updatedSelectedAnswers[questionIndex] = updatedSelectedAnswers[questionIndex].filter(a => a !== answer);
      } else {
        updatedSelectedAnswers[questionIndex] = [...updatedSelectedAnswers[questionIndex], answer];
      }
    }

    setSelectedAnswers(updatedSelectedAnswers);
  };

  const handleNextQuestion = () => {
    setCurrentQuestionIndex(currentQuestionIndex + 1);
  };

  const handleQuizSubmit = async () => {
    if (timerIntervalId) {
      clearInterval(timerIntervalId);
    }

    try {
      if (id) {
        console.log('Submitting quiz answers:', selectedAnswers);

        const response = await quizService.submitQuizAnswers(id, selectedAnswers, timeSpent);
        if (response.error) {
          setError(response.error);
        } else {
          const score = (response.data as { scorePercent: number }).scorePercent;
          console.log('Quiz time spent:', timeSpent);
          await addLeaderboardEntry(id, score, timeSpent);
          setScore(score);
          setShowResult(true);
        }
      }
    } catch (error) {
      setError('Failed to submit quiz answers');
    }
  };

  const addLeaderboardEntry = async (quizId: string, score: number, timeSpent: number) => {
    try {
      await quizService.addLeaderboardEntry(quizId, score, timeSpent);
    } catch (error) {
      console.error('Failed to add leaderboard entry:', error);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  if (!quiz) {
    return <div>Quiz not found</div>;
  }

  if (showResult) {
    return <QuizResultPage id={id} score={score} />;
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === quiz.questions.length - 1;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">{quiz.title}</h1>
      {timeRemaining !== null && (
        <div className="mb-4">
          <p className="text-lg font-semibold">
            Time Remaining: {timeRemaining} seconds
          </p>
        </div>
      )}
      <div className="mb-8">
        <p className="text-lg">
          Question {currentQuestionIndex + 1} of {quiz.questions.length}
        </p>
        <p className="text-xl font-semibold">{currentQuestion?.title}</p>
      </div>
      <div className="mb-8">
        {currentQuestion?.type === 'OPEN' ? (
          <textarea
            className="w-full px-3 py-2 text-gray-800 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
            rows={4}
            value={selectedAnswers[currentQuestionIndex][0] || ''}
            onChange={(e) => handleAnswerSelect(currentQuestionIndex, e.target.value)}
            placeholder="Enter your answer"
          />
        ) : (
          currentQuestion?.answers.map((answer) => (
            <div key={answer} className="mb-4">
              <label className="flex items-center">
                <input
                  type={currentQuestion.type === 'SINGLE' ? 'radio' : 'checkbox'}
                  className="mr-2"
                  checked={selectedAnswers[currentQuestionIndex].includes(answer)}
                  onChange={() => handleAnswerSelect(currentQuestionIndex, answer)}
                />
                <span>{answer}</span>
              </label>
            </div>
          ))
        )}
      </div>
      <div className="flex justify-between">
        {isLastQuestion ? (
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded"
            onClick={handleQuizSubmit}
          >
            Submit Quiz
          </button>
        ) : (
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded"
            onClick={handleNextQuestion}
          >
            Next Question
          </button>
        )}
      </div>
    </div>
  );
}