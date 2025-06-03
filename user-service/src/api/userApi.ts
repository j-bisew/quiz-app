import express, { Request, Response } from "express";
import prisma from "../db/prisma";
import { validateIdParam, validateUpdateRole, validateSearch, validateEmailParam } from "../middleware/validation";
const router = express.Router();

router.get("/", getUsers);
router.get("/:id", validateIdParam, getUser);
router.patch("/:id", validateIdParam, updateUser);
router.delete("/:id", validateIdParam, deleteUser);
router.get("/email/:email", validateEmailParam, searchByEmail);
router.delete("/email/:email", validateEmailParam, deleteUserByEmail);
router.patch("/email/:email/role", validateEmailParam, validateUpdateRole, updateRoleByEmail);

async function getUsers(_req: Request, res: Response) {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "An error occurred while fetching users" });
  }
}

async function getUser(req: Request, res: Response) {
  try {
    const userId = req.params.id;
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
    } else {
      res.json(user);
    }
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "An error occurred while fetching user" });
  }
}

async function updateUser(req: Request, res: Response) {
  try {
    const userId = req.params.id;
    const { name, email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ error: "User not found" });
    } else {
      const updatedUser = await prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          name,
          email,
          password,
        },
      });

      res.json(updatedUser);
    }
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "An error occurred while updating user" });
  }
}

async function deleteUser(req: Request, res: Response) {
  try {
    const userId = req.params.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ error: "User not found" });
    } else {
      await prisma.user.delete({ where: { id: userId } });
      res.json({ message: "User deleted successfully" });
    }
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "An error occurred while deleting user" });
  }
}

async function updateRoleByEmail(req: Request, res: Response) {
  try {
    const email = req.params.email as string;
    const role = req.body.role;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(404).json({ error: "User not found" });
    } else {
      await prisma.user.update({
        where: { email },
        data: { role },
      });

      res.json({ message: "Role updated successfully" });
    }
  } catch (error) {
    console.error("Error updating role:", error);
    res.status(500).json({ error: "An error occurred while updating role" });
  }
}

async function searchByEmail(req: Request, res: Response) {
  try {
    const email = req.params.email as string;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(404).json({ error: "User not found" });
    } else {
      res.json(user.id);
    }
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "An error occurred while fetching user" });
  }
}

async function deleteUserByEmail(req: Request, res: Response) {
  try {
    const email = req.params.email as string;
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
    } else {
      await prisma.user.delete({
        where: { email },
      });

      res.json({ message: "User deleted successfully" });
    }
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "An error occurred while deleting user" });
  }
}

export default router;
