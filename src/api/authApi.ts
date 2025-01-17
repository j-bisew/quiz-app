import express, { Request, Response } from 'express';
import prisma from '../db/prisma';
import bcrypt from 'bcryptjs';

const router = express.Router();

router.post('/login', login);
router.post('/register', register);

async function login(req: Request, res: Response) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).json({ error: 'Email and password are required' });
        } else {

            const user = await prisma.user.findUnique({
             where: { email },
             select: {
                    id: true,
                    name: true,
                    email: true,
                    password: true,
                    role: true,
                },
            });
            if (!user) {
                res.status(404).json({ error: 'User not found' });
            } else {
                const passwordMatch = await bcrypt.compare(password, user.password);
                if (!passwordMatch) {
                    res.status(401).json({ error: 'Invalid password' });
                } else {
                    const { password: _, ...userWithoutPassword } = user;
                    res.json(userWithoutPassword);
                }
            }
        }

    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).json({ error: 'An error occurred while logging in' });
    }
}

async function register(req: Request, res: Response) {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            res.status(400).json({ error: 'Name, email, and password are required' });
        } else {
            if (await prisma.user.findUnique({ where: { email } })) {
                res.status(400).json({ error: 'Email already in use' });
            } else {
                const hashedPassword = await bcrypt.hash(password, 10);
                const user = await prisma.user.create({
                    data: {
                        name,
                        email,
                        password: hashedPassword,
                    },
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                        createdAt: true,
                    },
                });
            res.status(201).json({message: "Registration successful", user});
            }
        }
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'An error occurred while registering user' });
    }
}

export default router;
