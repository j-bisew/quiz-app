import { PrismaClient, QuestionType, Difficulty, Role } from "@prisma/client";
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    await prisma.question.deleteMany();
    await prisma.quiz.deleteMany();
    await prisma.user.deleteMany();

    const hashedPassword = await bcrypt.hash("password", 10);

    const user1 = await prisma.user.create({
        data: {
            name: "michal",
            email: "michal@example.com",
            password: hashedPassword,
            role: Role.MODERATOR,
        },
    });

    const user2 = await prisma.user.create({
        data: {
            name: "zosia",
            email: "zosia@example.com",
            password: hashedPassword,
            role: Role.ADMIN,
        },
    });

    const user3 = await prisma.user.create({
        data: {
            name: "Pioter",
            email: "pioter@example.com",
            password: hashedPassword,
            role: Role.USER,
        },
    });

    await prisma.quiz.create({
        data: {
            title: "JavaScript Quiz",
            description: "Test your JavaScript knowledge",
            category: "Programming",
            difficulty: Difficulty.EASY,
            createdById: user1.id,
            questions: {
                create: [
                    {
                        question: "What is JavaScript?",
                        type: QuestionType.SINGLE,
                        answers: [
                            "A programming language",
                            "A type of coffee",
                            "A type of tea",
                        ],
                        correctAnswer: ["A programming language"],
                    },
                    {
                        question: "What is result of '2' + 2?",
                        type: QuestionType.SINGLE,
                        answers: ["'22'", "4", "2"],
                        correctAnswer: ["'22'"],
                    },
                ],
            },
        },
    });

    await prisma.quiz.create({
        data: {
            title: "Math Quiz",
            description: "Test your math knowledge",
            category: "Math",
            difficulty: Difficulty.MEDIUM,
            timeLimit: 60,
            createdById: user2.id,
            questions: {
                create: [
                    {
                        question: "What is root of 16?",
                        type: QuestionType.MULTIPLE,
                        answers: ["2", "4", "-4", "-2"],
                        correctAnswer: ["4", "-4"],
                    },
                    {
                        question: "What is 2 + 2 * 3?",
                        type: QuestionType.OPEN,
                        answers: [],
                        correctAnswer: ["8"],
                    },
                ],
            },
        },
    });

    await prisma.quiz.create({
        data: {
            title: "Geography Quiz",
            description: "Test your geography knowledge",
            category: "Geography",
            difficulty: Difficulty.HARD,
            timeLimit: 180,
            createdById: user3.id,
            questions: {
                create: [
                    {
                        question: "What is capital of France?",
                        type: QuestionType.SINGLE,
                        answers: ["Paris", "Berlin", "Madrid"],
                        correctAnswer: ["Paris"],
                    },
                    {
                        question: "What is capital of Germany?",
                        type: QuestionType.SINGLE,
                        answers: ["Paris", "Berlin", "Madrid"],
                        correctAnswer: ["Berlin"],
                    },
                ],
            },
        },
    });

    console.log("Data seeded successfully");
}

main()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });