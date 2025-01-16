import express from "express";
import { Request, Response } from "express";
import prisma from "../db/prisma";

const router = express.Router();

router.get("/", getQuizzes);
router.post("/", createQuiz);

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

export default router;