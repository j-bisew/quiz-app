'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SearchBar from '../components/searchBar';
import QuizList from '../components/quiz/QuizList';
import { quizService } from '../services/quiz';
import type { Quiz } from '../components/types/quiz';
import { User, UserRole } from '../components/types/auth';

export default function QuizzesPage() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');

  useEffect(() => {
    fetchQuizzes();
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  useEffect(() => {
    const debouncedSearch = setTimeout(() => {
      if (searchQuery) {
        searchQuizzes(searchQuery);
      } else {
        fetchQuizzes();
      }
    }, 300);

    return () => clearTimeout(debouncedSearch);
  }, [searchQuery]);

  async function fetchQuizzes() {
    try {
      setIsLoading(true);
      const data = await quizService.getQuizzes();
      if (data.error) {
        setError(data.error);
        return;
      } else if (data.data) {
        setQuizzes(data.data);
      }
    } catch (error) {
      setError('Failed to fetch quizzes');
    } finally {
      setIsLoading(false);
    }
  }

  const searchQuizzes = async (query: string) => {
    try {
      setIsLoading(true);
      const response = await quizService.searchQuizzes(query);
      if (response.error) {
        setError(response.error);
      } else if (response.data) {
        setQuizzes(response.data);
        setError(null);
      }
    } catch (err) {
      setError('Failed to search quizzes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (!window.confirm('Are you sure you want to delete this quiz?')) {
      return;
    }

    try {
      await quizService.deleteQuiz(quizId);
      fetchQuizzes();
    } catch (err) {
      setError('Failed to delete quiz');
    }
  };

  const canDeleteQuiz = (quiz: Quiz) => {
    if (!user) return false;
    if (user.role === UserRole.ADMIN) return true;
    if (user.role === UserRole.MODERATOR) return true;
    return false;
  };

  const filteredQuizzes = quizzes.filter((quiz) => {
    const matchesCategory =
      selectedCategory === 'all' || quiz.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesDifficulty =
      selectedDifficulty === 'all' ||
      quiz.difficulty.toLowerCase() === selectedDifficulty.toLowerCase();
    return matchesCategory && matchesDifficulty;
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        selectedDifficulty={selectedDifficulty}
        onDifficultyChange={setSelectedDifficulty}
      />

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <QuizList
          quizzes={filteredQuizzes}
          onDeleteQuiz={handleDeleteQuiz}
          canDeleteQuiz={canDeleteQuiz}
          setQuizzes={setQuizzes}
        />
      )}
    </div>
  );
}