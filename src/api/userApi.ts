import express, { Request, Response } from "express";
import prisma from "../db/prisma";

const router = express.Router();

router.get("/", getUsers);
router.get("/:id", getUser);
router.patch("/:id", updateUser);
router.delete("/:id", deleteUser);

async function getUsers(_req: Request, res: Response) {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'An error occurred while fetching users' });
  }
}

async function getUser(req: Request, res: Response) {
    try {
        const userId = req.params.id;
        const user = await prisma.user.findUnique({
            where: {
                id: userId,
            }
        });

        if (!user) {
            res.status(404).json({ error: 'User not found' });
        } else {
            res.json(user);
        }
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'An error occurred while fetching user' });
    }
}

async function updateUser(req: Request, res: Response) {
    try {
        const userId = req.params.id;
        const { name, email, password } = req.body;

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            res.status(404).json({ error: 'User not found' });
        } else {
            const updatedUser = await prisma.user.update({
                where: {
                    id: userId,
                },
                data: {
                    name,
                    email,
                    password,
                }
            });

            res.json(updatedUser);
        }
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'An error occurred while updating user' });
    }
}

async function deleteUser(req: Request, res: Response) {
    try {
        const userId = req.params.id;
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            res.status(404).json({ error: 'User not found' });
        } else {
            await prisma.user.delete({ where: { id: userId } });
            res.json({ message: 'User deleted successfully' });
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'An error occurred while deleting user' });
    }
}

export default router;