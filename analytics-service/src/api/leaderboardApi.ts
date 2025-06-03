import express, { Request, Response } from 'express';
import prisma from '../db/prisma';
import { authMiddleware, AuthenticatedRequest } from '../middleware/authMiddleware';
import { AnalyticsService } from '../db/mongodb';

const router = express.Router();

router.get('/:quizId', getQuizLeaderboard);
router.post('/:quizId', authMiddleware, addLeaderboardEntry);
router.get('/user/:userId/stats', getUserStats);
router.get('/popular/quizzes', getPopularQuizzes);

async function getQuizLeaderboard(req: Request, res: Response) {
  try {
    const quizId = req.params.quizId;
    const leaderboard = await prisma.leaderboardEntry.findMany({
      where: { quizId },
      orderBy: [{ score: 'desc' }, { timeSpent: 'asc' }],
      take: 10,
      include: {
        user: {
          select: { name: true },
        },
      },
    });

    res.json(
      leaderboard.map((entry) => ({
        id: entry.id,
        quizId: entry.quizId,
        userId: entry.userId,
        userName: entry.user.name,
        score: entry.score,
        timeSpent: entry.timeSpent,
        createdAt: entry.createdAt,
      }))
    );
  } catch (error) {
    console.error('Error fetching quiz leaderboard:', error);
    res.status(500).json({ error: 'An error occurred while fetching quiz leaderboard' });
  }
}

async function addLeaderboardEntry(req: AuthenticatedRequest, res: Response) {
  try {
    const quizId = req.params.quizId;
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

    await AnalyticsService.logActivity(
      userId,
      'quiz_completed',
      quizId,
      { score, timeSpent },
      req.ip
    );

    res.status(201).json(entry);
  } catch (error) {
    console.error('Error adding leaderboard entry:', error);
    res.status(500).json({ error: 'An error occurred while adding leaderboard entry' });
  }
}

async function getUserStats(req: Request, res: Response) {
  try {
    const userId = req.params.userId;

    const stats = await prisma.leaderboardEntry.groupBy({
      by: ['userId', 'quizId'],
      where: { userId },
      _count: { id: true },
      _avg: { score: true },
      _sum: { timeSpent: true },
    });

    const mongoStats = await AnalyticsService.getUserStats(userId);

    res.json({
      postgresql: stats[0] || { _count: { id: 0 }, _avg: { score: 0 }, _sum: { timeSpent: 0 } },
      mongodb: mongoStats,
      summary: {
        totalQuizzes: stats[0]?._count.id || 0,
        averageScore: stats[0]?._avg.score || 0,
        totalTimeSpent: stats[0]?._sum.timeSpent || 0,
        activities: mongoStats.length,
      },
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ error: 'An error occurred while fetching user stats' });
  }
}

async function getPopularQuizzes(req: Request, res: Response) {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const popularQuizzes = await AnalyticsService.getPopularQuizzes(limit);
    const enrichedQuizzes = await Promise.all(
      popularQuizzes.map(async (popularity) => {
        try {
          const quiz = await prisma.quiz.findUnique({
            where: { id: popularity.quizId },
            select: {
              id: true,
              title: true,
              description: true,
              category: true,
              difficulty: true,
              createdBy: {
                select: { name: true },
              },
            },
          });

          return {
            ...quiz,
            analytics: {
              totalAttempts: popularity.totalAttempts,
              averageScore: popularity.averageScore,
              popularityScore: popularity.popularityScore,
              lastActivity: popularity.lastActivity,
            },
          };
        } catch (error) {
          console.error(`Error fetching quiz ${popularity.quizId}:`, error);
          return null;
        }
      })
    );

    const validQuizzes = enrichedQuizzes.filter((quiz) => quiz !== null);

    res.json(validQuizzes);
  } catch (error) {
    console.error('Error fetching popular quizzes:', error);
    res.status(500).json({ error: 'An error occurred while fetching popular quizzes' });
  }
}

export default router;
