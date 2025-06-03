import express, { Request, Response } from 'express';
import prisma from '.././db/prisma';
import { authMiddleware, AuthenticatedRequest } from '../middleware/authMiddleware';
import { AnalyticsService } from '../db/mongodb';
import { validateComment, validateQuizId, validateCommentId } from '../middleware/validation'; // 👈 DODAJ

const router = express.Router();

router.get('/:quizId', validateQuizId, getQuizComments);
router.post('/:quizId', authMiddleware, validateQuizId, validateComment, addComment);
router.delete('/:quizId/:commentId', authMiddleware, validateCommentId, deleteComment);

async function getQuizComments(req: Request, res: Response) {
  try {
    const quizId = req.params.quizId;
    const comments = await prisma.comment.findMany({
      where: { quizId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { name: true },
        },
      },
    });

    res.json(
      comments.map((comment: any) => ({
        id: comment.id,
        quizId: comment.quizId,
        userId: comment.userId,
        userName: comment.user.name,
        text: comment.text,
        createdAt: comment.createdAt,
      }))
    );
  } catch (error) {
    console.error('Error fetching quiz comments:', error);
    res.status(500).json({ error: 'An error occurred while fetching quiz comments' });
  }
}

async function addComment(req: AuthenticatedRequest, res: Response) {
  try {
    const quizId = req.params.quizId;
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

    await AnalyticsService.logActivity(
      userId,
      'comment_added',
      quizId,
      { commentText: text },
      req.ip
    );

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

async function deleteComment(req: AuthenticatedRequest, res: Response) {
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
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { role: true },
      });

      if (comment.userId !== req.user!.id && user?.role !== 'ADMIN') {
        res.status(403).json({ error: 'You do not have permission to delete this comment' });
        return;
      }

      await prisma.comment.delete({ where: { id: commentId } });

      await AnalyticsService.logActivity(
        req.user!.id,
        'comment_deleted',
        comment.quizId,
        { deleteCommentId: commentId },
        req.ip
      );

      res.status(204).end();
    }
  } catch (error) {
    console.error('Error deleting quiz comment:', error);
    res.status(500).json({ error: 'An error occurred while deleting quiz comment' });
  }
}

export default router;
