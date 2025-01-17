import express, { Request, Response } from "express";
import prisma from "../db/prisma";

const router = express.Router();

router.get("/", getQuizzes);
router.post("/", createQuiz);
router.get("/search", searchQuizzes);
router.get("/:id", getQuiz);
router.patch("/:id", updateQuiz);
router.delete("/:id", deleteQuiz);

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

async function createQuiz(req: Request, res: Response) {
  try {
    const { title, description, category, difficulty, timeLimit, createdById, questions } = req.body;

    const quiz = await prisma.quiz.create({
      data: {
        title,
        description,
        category,
        difficulty,
        timeLimit,
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

async function updateQuiz(req: Request, res: Response) {
  try {
    const quizId = req.params.id;
    const { title, description, category, difficulty, timeLimit, questions } = req.body;
    await prisma.question.deleteMany({ where: { quizId } });

    const quiz = await prisma.quiz.update({
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

    res.json(quiz);
  } catch (error) {
    console.error('Error updating quiz:', error);
    res.status(500).json({ error: 'An error occurred while updating a quiz' });
  }
}

async function deleteQuiz(req: Request, res: Response) {
  try {
    const quizId = req.params.id;
    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });

    if (!quiz) {
      res.status(404).json({ error: 'Quiz not found' });
    } else {
      await prisma.quiz.delete({ where: { id: quizId } });
      res.status(204).json("Quiz deleted successfully");
    }
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

export default router;