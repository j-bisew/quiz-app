import request from 'supertest';
import app from './testApp';
import { prisma } from './setup';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

describe('Users API', () => {
  let testUsers: any[] = [];

  beforeEach(async () => {
    const hashedPassword = await bcrypt.hash('password123', 10);

    const user1 = await prisma.user.create({
      data: {
        name: 'User One',
        email: 'user1@example.com',
        password: hashedPassword,
        role: 'USER',
      },
    });

    const user2 = await prisma.user.create({
      data: {
        name: 'User Two',
        email: 'user2@example.com',
        password: hashedPassword,
        role: 'MODERATOR',
      },
    });

    testUsers = [user1, user2];
  });

  describe('GET /api/users', () => {
    it('should return all users', async () => {
      const response = await request(app).get('/api/users').expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('email');
      expect(response.body[0]).toHaveProperty('name');
    });
  });

  describe('GET /api/users/:id', () => {
    it('should return user by id', async () => {
      const userId = testUsers[0].id;

      const response = await request(app).get(`/api/users/${userId}`).expect(200);

      expect(response.body.id).toBe(userId);
      expect(response.body.email).toBe('user1@example.com');
      expect(response.body.name).toBe('User One');
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app).get('/api/users/nonexistent-id').expect(404);

      expect(response.body.error).toBe('User not found');
    });
  });

  describe('PATCH /api/users/:id', () => {
    it('should update user successfully with valid token', async () => {
      const userId = testUsers[0].id;
      const userEmail = testUsers[0].email;
      const updateData = {
        name: 'Updated Name',
        password: 'passWord123',
      };

      const mockToken = jwt.sign(
        { userId: userId },
        'super-secret-token',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .patch(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${mockToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
      expect(response.body.email).toBe(userEmail);
      expect(response.body.id).toBe(userId);
    });

    it('should return 401 when no token is provided', async () => {
      const userId = testUsers[0].id;
      const updateData = {
        name: 'Updated Name',
        email: 'updated@example.com',
      };

      const response = await request(app)
        .patch(`/api/users/${userId}`)
        .send(updateData)
        .expect(401);

      expect(response.body.error).toBe('No token provided');
    });

    it('should return 401 with invalid token', async () => {
      const userId = testUsers[0].id;
      const updateData = {
        name: 'Updated Name',
        email: 'updated@example.com',
      };

      const response = await request(app)
        .patch(`/api/users/${userId}`)
        .set('Authorization', 'Bearer invalid-token')
        .send(updateData)
        .expect(401);

      expect(response.body.error).toBe('Invalid token');
    });

    it('should return 404 when updating non-existent user', async () => {
      const mockToken = jwt.sign(
        { userId: 'nonexistent-id' },
        'super-secret-token',
        { expiresIn: '1h' }
      );
      
      const response = await request(app)
        .patch('/api/users/nonexistent-id')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ name: 'New Name' })
        .expect(404);

      expect(response.body.error).toBe('User not found');
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should delete user successfully with valid token', async () => {
      const userId = testUsers[0].id;

      const mockToken = jwt.sign(
        { userId: userId },
        'super-secret-token',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .delete(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(response.body.message).toBe('User deleted successfully');

      const deletedUser = await prisma.user.findUnique({
        where: { id: userId },
      });
      expect(deletedUser).toBeNull();
    });

    it('should return 401 when no token is provided', async () => {
      const userId = testUsers[0].id;

      const response = await request(app)
        .delete(`/api/users/${userId}`)
        .expect(401);

      expect(response.body.error).toBe('No token provided');
    });

    it('should return 401 with invalid token', async () => {
      const userId = testUsers[0].id;

      const response = await request(app)
        .delete(`/api/users/${userId}`)
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error).toBe('Invalid token');
    });

    it('should return 404 when deleting non-existent user', async () => {
      const mockToken = jwt.sign(
        { userId: 'nonexistent-id' },
        'super-secret-token',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .delete('/api/users/nonexistent-id')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(404);

      expect(response.body.error).toBe('User not found');
    });
  });


  describe('GET /api/users/email/:email', () => {
    it('should return user id by email', async () => {
      const userEmail = testUsers[0].email;

      const response = await request(app)
        .get(`/api/users/email/${encodeURIComponent(userEmail)}`)
        .expect(200);

      expect(response.body).toBe(testUsers[0].id);
    });

    it('should return 404 for non-existent email', async () => {
      const response = await request(app)
        .get('/api/users/email/nonexistent@example.com')
        .expect(404);

      expect(response.body.error).toBe('User not found');
    });
  });

  describe('DELETE /api/users/email/:email', () => {
    it('should delete user by email', async () => {
      const userEmail = testUsers[0].email;

      const response = await request(app)
        .delete(`/api/users/email/${encodeURIComponent(userEmail)}`)
        .expect(200);

      expect(response.body.message).toBe('User deleted successfully');
    });
  });

  describe('PATCH /api/users/email/:email/role', () => {
    it('should update user role by email', async () => {
      const userEmail = testUsers[0].email;

      const response = await request(app)
        .patch(`/api/users/email/${encodeURIComponent(userEmail)}/role`)
        .send({ role: 'ADMIN' })
        .expect(200);

      expect(response.body.message).toBe('Role updated successfully');

      const updatedUser = await prisma.user.findUnique({
        where: { email: userEmail },
      });
      expect(updatedUser?.role).toBe('ADMIN');
    });

    it('should return 404 for non-existent email', async () => {
      const response = await request(app)
        .patch('/api/users/email/nonexistent@example.com/role')
        .send({ role: 'ADMIN' })
        .expect(404);

      expect(response.body.error).toBe('User not found');
    });
  });
});
