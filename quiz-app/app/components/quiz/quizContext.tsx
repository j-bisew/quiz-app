'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { Quiz, QuizFormData } from '../types/quiz';
import { quizService } from '../../services/quiz';

interface QuizContextValue {
    quizzes: Quiz[];
    currentQuiz: Quiz | null;
    loading: boolean;
    error: Error | null;
    fetchQuizzes: () => Promise<void>;
    fetchQuiz: (id: string) => Promise<void>;
    createQuiz: (quizData: QuizFormData) => Promise<Quiz>;
    updateQuiz: (id: string, quizData: Partial<QuizFormData>) => Promise<Quiz>;
    deleteQuiz: (id: string) => Promise<void>;
    searchQuizzes: (pattern: string) => Promise<Quiz[]>;
}

const QuizContext = createContext<QuizContextValue | undefined>(undefined);

export const QuizProvider = ({ children }: { children: React.ReactNode }) => {
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const fetchQuizzes = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await quizService.getQuizzes();
            if (!response?.data) {
                throw new Error('Invalid response format');
            }
            setQuizzes(response.data);
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Failed to fetch quizzes');
            setError(error);
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchQuiz = useCallback(async (id: string) => {
        setLoading(true);
        setError(null);
        try {
            const response = await quizService.getQuiz(id);
            if (!response?.data) {
                setError(new Error('Quiz not found'));
                return;
            }
            setCurrentQuiz(response.data);
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Failed to fetch quiz');
            setError(error);
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    const createQuiz = useCallback(async (data: QuizFormData) => {
        setLoading(true);
        setError(null);
        try {
            const response = await quizService.createQuiz(data);
            if (!response?.data) {
                throw new Error('Failed to create quiz');
            }
            const newQuiz = response.data;
            setQuizzes(prev => [...prev, newQuiz]);
            return newQuiz;
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Failed to create quiz');
            setError(error);
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    const updateQuiz = useCallback(async (id: string, quizData: Partial<QuizFormData>) => {
        setLoading(true);
        setError(null);
        try {
            const response = await quizService.updateQuiz(id, quizData);
            if (!response?.data) {
                throw new Error('Failed to update quiz');
            }
            const updatedQuiz = response.data;
            setQuizzes(prev => prev.map(quiz => 
                quiz.id === id ? updatedQuiz : quiz
            ));
            setCurrentQuiz(prev => 
                prev?.id === id ? updatedQuiz : prev
            );
            return updatedQuiz;
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Failed to update quiz');
            setError(error);
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    const deleteQuiz = useCallback(async (id: string) => {
        setLoading(true);
        setError(null);
        try {
            await quizService.deleteQuiz(id);
            setQuizzes(prev => prev.filter(quiz => quiz.id !== id));
            setCurrentQuiz(prev => prev?.id === id ? null : prev);
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Failed to delete quiz');
            setError(error);
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    const searchQuizzes = useCallback(async (pattern: string) => {
        setLoading(true);
        setError(null);
        try {
            const response = await quizService.searchQuizzes(pattern);
            if (!response?.data) {
                return [];
            }
            setQuizzes(response.data);
            return response.data;
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Failed to search quizzes');
            setError(error);
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    return (
        <QuizContext.Provider 
            value={{
                quizzes,
                currentQuiz,
                loading,
                error,
                fetchQuizzes,
                fetchQuiz,
                createQuiz,
                updateQuiz,
                deleteQuiz,
                searchQuizzes,
            }}
        >
            {children}
        </QuizContext.Provider>
    );
};

export const useQuizContext = () => {
    const context = useContext(QuizContext);
    if (!context) {
        throw new Error('useQuizContext must be used within a QuizProvider');
    }
    return context;
};