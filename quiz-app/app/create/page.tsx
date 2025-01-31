'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import QuizForm from '../components/quiz/quizForm';
import { QuizProvider, useQuizContext } from '../components/quiz/quizContext';
import type { QuizFormData } from '../components/types/quiz';

function CreateQuizContent() {
  const router = useRouter();
  const { createQuiz } = useQuizContext();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (formData: QuizFormData) => {
    try {
      setError(null);
      const user = localStorage.getItem('user');
      if (!user) {
        router.push('/');
        return;
      }

      const userData = JSON.parse(user);
      
      const quizData = {
        ...formData,
        createdById: userData.id,
      };

      await createQuiz(quizData);
      router.push('/quizzes');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create quiz');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded text-red-500">
          {error}
        </div>
      )}
      <QuizForm onSubmit={handleSubmit} />
    </div>
  );
}

export default function CreateQuizPage() {
  return (
    <QuizProvider>
      <CreateQuizContent />
    </QuizProvider>
  );
}