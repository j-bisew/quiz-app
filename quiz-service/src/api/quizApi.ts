import express, { Request, Response } from "express";
import prisma from "../db/prisma";
import { authMiddleware, AuthenticatedRequest } from '../middleware/authMiddleware';

const router = express.Router();

router.get("/", getQuizzes);
router.post("/", authMiddleware, createQuiz);
router.get("/search", searchQuizzes);
router.get("/:id", getQuiz);
router.patch("/:id", authMiddleware, updateQuiz);
router.delete("/:id", authMiddleware, deleteQuiz);
router.post("/:id/check-answers", checkAnswers);

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
            }
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
    const newTimeLimit = timeLimit === '' ? null : Number(timeLimit);

    const createdById = req.user!.id;

    const quiz = await prisma.quiz.create({
      data: {
        title,
        description,
        category,
        difficulty,
        timeLimit: newTimeLimit,
        createdById,
        questions: {
          create: questions
        }
      },
      include: {
        questions: true
      }
    });


    res.status(201).json(quiz);
  } catch (error) {
    console.error('Error creating quiz:', error);
    res.status(500).json({ error: 'An error occurred while creating a quiz' });
  }
};

async function getQuiz(req: Request, res: Response) {
  try {
    const quizId = req.params.id;
    const quiz = await prisma.quiz.findUnique({
        where: { id: quizId },
        include: {
            questions: true,
            createdBy: {
                select: {
                    id: true,
                    name: true,
                },
            }
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
    
    const existingQuiz = await prisma.quiz.findUnique({ where: { id: quizId }, select: { createdById: true } });
    
    if (!existingQuiz) {
      res.status(404).json({ error: 'Quiz not found' });
      return;
    }

    if (existingQuiz.createdById !== req.user!.id) {
      res.status(403).json({ error: 'You do not have permission to update this quiz' });
      return;
    }
    
    await prisma.question.deleteMany({ where: { quizId } });

    const updatedQuiz = await prisma.quiz.update({
      where: { id: quizId },
      data: {
        title,
        description,
        category,
        difficulty,
        timeLimit,
        questions: {
          create: questions
        }
      },
      include: {
        questions: true,
        createdBy: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    res.json(updatedQuiz);
  } catch (error) {
    console.error('Error updating quiz:', error);
    res.status(500).json({ error: 'An error occurred while updating a quiz' });
  }
}

async function deleteQuiz(req: AuthenticatedRequest, res: Response) {
  try {
    const quizId = req.params.id;
    const quiz = await prisma.quiz.findUnique({ where: { id: quizId }, select: { createdById: true } });

    if (!quiz) {
      res.status(404).json({ error: 'Quiz not found' });
      return;
    }
    if (quiz.createdById !== req.user!.id) {
      res.status(403).json({ error: 'You do not have permission to delete this quiz' });
      return;
    }
    await prisma.quiz.delete({ where: { id: quizId } });
    res.status(204).json("Quiz deleted successfully");
    
  } catch (error) {
    console.error('Error deleting quiz:', error);
    res.status(500).json({ error: 'An error occurred while deleting a quiz' });
  }
}

async function searchQuizzes(req: Request, res: Response) {
  try {
    const { pattern } = req.query;

    if (!pattern || typeof pattern !== 'string') {
      res.status(400).json({ error: 'Invalid search pattern' });
  } else {
  
    const quizzes = await prisma.quiz.findMany({
      where: {
        OR: [
          { title: { contains: pattern, mode: 'insensitive' } },
          { description: { contains: pattern, mode: 'insensitive' } },
          { category: { contains: pattern, mode: 'insensitive' } },
        ],
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

    res.json(quizzes);
  }
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
        questions: true,
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
    const scorePercent = (correctCount / totalQuestions) * 100;

    res.json({ scorePercent, timeSpent });
  
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