import express, { Request, Response } from 'express';
import prisma from '../db/prisma';
import { authMiddleware, AuthenticatedRequest } from '../middleware/authMiddleware';
import {
  validateCreateQuiz,
  validateUpdateQuiz,
  validateSearch,
  validateCheckAnswers,
} from '../middleware/validation';

const router = express.Router();

router.get('/', getQuizzes);
router.post('/', authMiddleware, validateCreateQuiz, createQuiz);
router.get('/search', validateSearch, searchQuizzes);
router.get('/:id', getQuiz);
router.patch('/:id', authMiddleware, validateUpdateQuiz, updateQuiz);
router.delete('/:id', authMiddleware, deleteQuiz);
router.post('/:id/check-answers', validateCheckAnswers, checkAnswers);

async function getQuizzes(_req: Request, res: Response) {
  try {
    const quizzes = await prisma.quiz.findMany({
      include: {
        questions: true,
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            comments: true,
            leaderboardEntries: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    res.json(quizzes);
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    res.status(500).json({ error: 'An error occurred while fetching quizzes' });
  }
}

async function createQuiz(req: AuthenticatedRequest, res: Response) {
  try {
    const { title, description, category, difficulty, timeLimit, questions } = req.body;
    const newTimeLimit = timeLimit === '' || timeLimit === undefined ? null : Number(timeLimit);
    const createdById = req.user!.id;

    const quiz = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: createdById },
      });

      if (!user) {
        throw new Error('User not found');
      }

      const newQuiz = await tx.quiz.create({
        data: {
          title,
          description,
          category,
          difficulty,
          timeLimit: newTimeLimit,
          createdById,
          questions: {
            create: questions.map((q: any) => ({
              title: q.title,
              type: q.type,
              answers: q.answers,
              correctAnswer: q.correctAnswer,
            })),
          },
        },
        include: {
          questions: true,
          createdBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      console.log(`Quiz created: ${newQuiz.id} by user: ${createdById}`);

      return newQuiz;
    });

    res.status(201).json(quiz);
  } catch (error) {
    console.error('Error creating quiz:', error);
    res.status(500).json({ error: 'An error occurred while creating a quiz' });
  }
}

async function getQuiz(req: Request, res: Response) {
  try {
    const quizId = req.params.id;
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          orderBy: {
            createdAt: 'asc',
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
        leaderboardEntries: {
          select: {
            score: true,
            timeSpent: true,
            user: {
              select: {
                name: true,
              },
            },
          },
          orderBy: [{ score: 'desc' }, { timeSpent: 'asc' }],
          take: 5,
        },
        _count: {
          select: {
            comments: true,
            leaderboardEntries: true,
          },
        },
      },
    });

    if (!quiz) {
      res.status(404).json({ error: 'Quiz not found' });
    } else {
      res.json(quiz);
    }
  } catch (error) {
    console.error('Error fetching quiz:', error);
    res.status(500).json({ error: 'An error occurred while fetching quiz' });
  }
}

async function updateQuiz(req: AuthenticatedRequest, res: Response) {
  try {
    const quizId = req.params.id;
    const { title, description, category, difficulty, timeLimit, questions } = req.body;

    const updatedQuiz = await prisma.$transaction(async (tx) => {
      const existingQuiz = await tx.quiz.findUnique({
        where: { id: quizId },
        select: { createdById: true },
      });

      if (!existingQuiz) {
        throw new Error('Quiz not found');
      }

      if (existingQuiz.createdById !== req.user!.id) {
        throw new Error('Unauthorized');
      }

      await tx.question.deleteMany({ where: { quizId } });

      return await tx.quiz.update({
        where: { id: quizId },
        data: {
          title,
          description,
          category,
          difficulty,
          timeLimit,
          questions: {
            create: questions.map((q: any) => ({
              title: q.title,
              type: q.type,
              answers: q.answers,
              correctAnswer: q.correctAnswer,
            })),
          },
        },
        include: {
          questions: true,
          createdBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    });

    res.json(updatedQuiz);
  } catch (error) {
    console.error('Error updating quiz:', error);
    if (error instanceof Error) {
      if (error.message === 'Quiz not found') {
        res.status(404).json({ error: 'Quiz not found' });
        return;
      }
      if (error.message === 'Unauthorized') {
        res.status(403).json({ error: 'You do not have permission to update this quiz' });
        return;
      }
    }
    res.status(500).json({ error: 'An error occurred while updating a quiz' });
  }
}

async function deleteQuiz(req: AuthenticatedRequest, res: Response) {
  try {
    const quizId = req.params.id;

    await prisma.$transaction(async (tx) => {
      const quiz = await tx.quiz.findUnique({
        where: { id: quizId },
        select: { createdById: true, title: true },
      });

      if (!quiz) {
        throw new Error('Quiz not found');
      }

      if (quiz.createdById !== req.user!.id) {
        throw new Error('Unauthorized');
      }

      await tx.quiz.delete({ where: { id: quizId } });

      console.log(`Quiz deleted: ${quizId} (${quiz.title}) by user: ${req.user!.id}`);
    });

    res.status(204).json('Quiz deleted successfully');
  } catch (error) {
    console.error('Error deleting quiz:', error);
    if (error instanceof Error) {
      if (error.message === 'Quiz not found') {
        res.status(404).json({ error: 'Quiz not found' });
        return;
      }
      if (error.message === 'Unauthorized') {
        res.status(403).json({ error: 'You do not have permission to delete this quiz' });
        return;
      }
    }
    res.status(500).json({ error: 'An error occurred while deleting a quiz' });
  }
}

async function searchQuizzes(req: Request, res: Response) {
  try {
    const { pattern, category, difficulty } = req.query;

    if (!pattern || typeof pattern !== 'string') {
      res.status(400).json({ error: 'Invalid search pattern' });
      return;
    }

    const whereClause: any = {
      OR: [
        { title: { contains: pattern, mode: 'insensitive' } },
        { description: { contains: pattern, mode: 'insensitive' } },
        { category: { contains: pattern, mode: 'insensitive' } },
      ],
    };

    if (category && typeof category === 'string') {
      whereClause.category = { equals: category, mode: 'insensitive' };
    }

    if (difficulty && typeof difficulty === 'string') {
      whereClause.difficulty = difficulty;
    }

    const quizzes = await prisma.quiz.findMany({
      where: whereClause,
      include: {
        questions: {
          select: {
            id: true,
            title: true,
            type: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            comments: true,
            leaderboardEntries: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    res.json(quizzes);
  } catch (error) {
    console.error('Error searching quizzes:', error);
    res.status(500).json({ error: 'An error occurred while searching quizzes' });
  }
}

async function checkAnswers(req: Request, res: Response) {
  try {
    const { answers, timeSpent } = req.body;
    const quizId = req.params.id;

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!quiz) {
      res.status(404).json({ error: 'Quiz not found' });
      return;
    }

    const correctAnswers = quiz.questions.map((question: any) => question.correctAnswer);
    const totalQuestions = correctAnswers.length;

    const correctCount = answers.reduce((count: number, answer: string[], index: number) => {
      return count + (arraysEqual(answer, correctAnswers[index]) ? 1 : 0);
    }, 0);

    const scorePercent = Math.round((correctCount / totalQuestions) * 100);

    const detailedResults = quiz.questions.map((question: any, index: number) => ({
      questionId: question.id,
      questionTitle: question.title,
      userAnswer: answers[index] || [],
      correctAnswer: question.correctAnswer,
      isCorrect: arraysEqual(answers[index] || [], question.correctAnswer),
    }));

    res.json({
      scorePercent,
      timeSpent,
      correctCount,
      totalQuestions,
      detailedResults,
    });
  } catch (error) {
    console.error('Error checking answers:', error);
    res.status(500).json({ error: 'An error occurred while checking answers' });
  }
}

function arraysEqual(a: string[], b: string[]) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (a.length !== b.length) return false;

  const sortedA = [...a].sort();
  const sortedB = [...b].sort();

  for (let i = 0; i < sortedA.length; ++i) {
    if (sortedA[i] !== sortedB[i]) return false;
  }
  return true;
}

export default router;
