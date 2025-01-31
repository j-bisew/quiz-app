export type QuestionType = 'SINGLE' | 'MULTIPLE' | 'OPEN';
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface Question {
  id?: string;
  title: string;
  type: QuestionType;
  answers: string[];
  correctAnswer: string[];
  quizId?: string;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: Difficulty;
  timeLimit: number | null;
  questions: Question[];
  createdBy: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
  createdById: string;
}

export interface QuizFormData {
  title: string;
  description: string;
  category: string;
  difficulty: Difficulty;
  timeLimit?: number;
  questions: Omit<Question, 'id' | 'quizId'>[];
  createdById?: string;
}

export interface QuizSubmission {
  answers: {
    [questionId: string]: string[];
  };
  timeSpent?: number;
  submittedAt: string;
}

export interface QuizComment {
  id: string;
  quizId: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
}