import express, { Request, Response } from "express";
import prisma from "../db/prisma";
import {mqttClient} from "../liveQuizServer";
// import { randomUUID } from "crypto";
import { authMiddleware, AuthenticatedRequest } from '../middleware/authMiddleware';

const router = express.Router();

router.get("/", getQuizzes);
router.post("/", authMiddleware, createQuiz);
router.get("/search", searchQuizzes);
router.get("/:id", getQuiz);
router.patch("/:id", authMiddleware, updateQuiz);
router.delete("/:id", authMiddleware, deleteQuiz);

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
    const { title, description, category, difficulty, timeLimit, createdById, questions } = req.body;
    const newTimeLimit = timeLimit === '' ? null : Number(timeLimit);
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

    mqttClient.publish('quizzes/updates', JSON.stringify({ 
      type: 'created',
      quiz: quiz,
    }));

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

    mqttClient.publish('quizzes/updates', JSON.stringify({
      type: 'updated',
      quiz: updatedQuiz,
    }));

    res.json(updatedQuiz);
  } catch (error) {
    console.error('Error updating quiz:', error);
    res.status(500).json({ error: 'An error occurred while updating a quiz' });
  }
}

async function deleteQuiz(req: AuthenticatedRequest, res: Response) {
  try {
    const quizId = req.params.id;
    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });

    if (!quiz) {
      res.status(404).json({ error: 'Quiz not found' });
    } else {
      await prisma.quiz.delete({ where: { id: quizId } });

      mqttClient.publish('quizzes/updates', JSON.stringify({
        type: 'deleted',
        quizId: quizId,
      }));

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
    } else {
      const correctAnswers = quiz.questions.map((question) => question.correctAnswer);
      const totalQuestions = correctAnswers.length;
      const correctCount = answers.reduce((count: number, answer: string[], index: number) => {
        return count + (arraysEqual(answer, correctAnswers[index]) ? 1 : 0);
      }, 0);
      const scorePercent = (correctCount / totalQuestions) * 100;

      res.json({ scorePercent, timeSpent });
    }
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
router.post("/:id/check-answers", checkAnswers);

// function generateSessionId() {
//   return randomUUID();
// }

// async function startLiveQuizSession(req: Request, res: Response) {
//   try {
//     const quizId = req.params.id;
//     const quiz = await prisma.quiz.findUnique({
//       where: { id: quizId },
//       include: { questions: true },
//     });

//     if (!quiz) {
//       res.status(404).json({ error: 'Quiz not found' });
//     } else {
//       const sessionId = generateSessionId();

//       mqttClient.publish(`quizzes/${quizId}/sessions/${sessionId}`, JSON.stringify({
//         type: 'session_start',
//         quizId,
//         sessionId,
//         quiz,
//       }));

//       res.json({ sessionId });
//     }
//   } catch (error) {
//     console.error('Error starting live quiz session:', error);
//     res.status(500).json({ error: 'An error occurred while starting the live quiz session' });
//   }
// }

// async function joinLiveQuizSession(req: Request, res: Response) {
//   try {
//     const quizId = req.params.id;
//     const sessionId = req.params.sessionId;
//     const userId = req.body.userId;

//     mqttClient.publish(`quizzes/${quizId}/sessions/${sessionId}`, JSON.stringify({
//       type: 'user_join',
//       quizId,
//       sessionId,
//       userId,
//     }));

//     res.json({ message: 'Joined live quiz session successfully' });
//   } catch (error) {
//     console.error('Error joining live quiz session:', error);
//     res.status(500).json({ error: 'An error occurred while joining the live quiz session' });
//   }
// }

// async function submitLiveQuizAnswer(req: Request, res: Response) {
//   try {
//     const quizId = req.params.id;
//     const sessionId = req.params.sessionId;
//     const questionId = req.params.questionId;
//     const userId = req.body.userId;
//     const answer = req.body.answer;

//     mqttClient.publish(`quizzes/${quizId}/sessions/${sessionId}`, JSON.stringify({
//       type: 'user_answer',
//       quizId,
//       sessionId,
//       questionId,
//       userId,
//       answer,
//     }));

//     res.json({ message: 'Answer submitted successfully' });
//   } catch (error) {
//     console.error('Error submitting live quiz answer:', error);
//     res.status(500).json({ error: 'An error occurred while submitting the answer' });
//   }
// }

// router.post('/:id/live-sessions/start', startLiveQuizSession);
// router.post('/:id/live-sessions/:sessionId/join', joinLiveQuizSession);
// router.post('/:id/live-sessions/:sessionId/questions/:questionId/submit', submitLiveQuizAnswer);

async function getQuizLeaderboard(req: Request, res: Response) {
  try {
    const quizId = req.params.id;
    const leaderboard = await prisma.leaderboardEntry.findMany({
      where: { quizId },
      orderBy: [
        { score: 'desc' },
        { timeSpent: 'asc' },
      ],
      take: 10,
      include: {
        user: {
          select: { name: true },
        },
      },
    });

    res.json(leaderboard.map((entry) => ({
      id: entry.id,
      quizId: entry.quizId,
      userId: entry.userId,
      userName: entry.user.name,
      score: entry.score,
      timeSpent: entry.timeSpent,
    })));
  } catch (error) {
    console.error('Error fetching quiz leaderboard:', error);
    res.status(500).json({ error: 'An error occurred while fetching quiz leaderboard' });
  }
}

async function getQuizComments(req: Request, res: Response) {
  try {
    const quizId = req.params.id;
    const comments = await prisma.comment.findMany({
      where: { quizId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { name: true },
        },
      },
    });

    res.json(comments.map((comment) => ({
      id: comment.id,
      quizId: comment.quizId,
      userId: comment.userId,
      userName: comment.user.name,
      text: comment.text,
      createdAt: comment.createdAt,
    })));
  } catch (error) {
    console.error('Error fetching quiz comments:', error);
    res.status(500).json({ error: 'An error occurred while fetching quiz comments' });
  }
}

async function addQuizComment(req: AuthenticatedRequest, res: Response) {
  try {
    const quizId = req.params.id;
    const userId = req.user!.id;
    const { text } = req.body;

    const comment = await prisma.comment.create({
      data: {
        text,
        user: { connect: { id: userId } },
        quiz: { connect: { id: quizId } },
      },
      include: {
        user: {
          select: { name: true },
        },
      },
    });

    mqttClient.publish(`quizzes/${quizId}/comments`, JSON.stringify({
      type: 'comment_added',
      comment: {
        id: comment.id,
        quizId: comment.quizId,
        userId: comment.userId,
        userName: comment.user.name,
        text: comment.text,
        createdAt: comment.createdAt,
      },
    }));

    res.status(201).json({
      id: comment.id,
      quizId: comment.quizId,
      userId: comment.userId,
      userName: comment.user.name,
      text: comment.text,
      createdAt: comment.createdAt,
    });
  } catch (error) {
    console.error('Error adding quiz comment:', error);
    res.status(500).json({ error: 'An error occurred while adding quiz comment' });
  }
}

router.get('/:id/leaderboard', getQuizLeaderboard);
router.get('/:id/comments', getQuizComments);
router.post('/:id/comments', authMiddleware, addQuizComment);

async function deleteQuizComment(req: AuthenticatedRequest, res: Response) {
  try {
    const commentId = req.params.commentId;

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        user: true,
        quiz: true,
      },
    });

    if (!comment) {
      res.status(404).json({ error: 'Comment not found' });
    } else {
      await prisma.comment.delete({ where: { id: commentId } });

      mqttClient.publish(`quizzes/${comment.quizId}/comments`, JSON.stringify({
        type: 'comment_deleted',
        commentId: commentId,
      }));

      console.log('Published MQTT message for comment deletion:', {
        topic: `quizzes/${comment.quizId}/comments`,
        message: {
          type: 'comment_deleted',
          commentId: commentId,
        },
      });

      res.status(204).end();
    }
  } catch (error) {
    console.error('Error deleting quiz comment:', error);
    res.status(500).json({ error: 'An error occurred while deleting quiz comment' });
  }
}

router.delete('/:id/comments/:commentId', authMiddleware, deleteQuizComment);

async function addLeaderboardEntry(req: AuthenticatedRequest, res: Response) {
  try {
    const quizId = req.params.id;
    const userId = req.user!.id;
    const { score, timeSpent } = req.body;

    const entry = await prisma.leaderboardEntry.create({
      data: {
        score,
        timeSpent,
        user: { connect: { id: userId } },
        quiz: { connect: { id: quizId } },
      },
    });

    res.status(201).json(entry);
  } catch (error) {
    console.error('Error adding leaderboard entry:', error);
    res.status(500).json({ error: 'An error occurred while adding leaderboard entry' });
  }
}

router.post('/:id/leaderboard', authMiddleware, addLeaderboardEntry);

export default router;