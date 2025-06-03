import request from 'supertest';
import app from './testApp';
import { prisma } from './setup';
import bcrypt from 'bcryptjs';

describe('Auth API', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123',
      };

      const response = await request(app).post('/api/auth/register').send(userData).expect(201);

      expect(response.body.message).toBe('Registration successful');
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.name).toBe(userData.name);
      expect(response.body.user.password).toBeUndefined();
      expect(response.body.user.role).toBe('USER');
    });

    it('should return 400 when required fields are missing', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
        })
        .expect(400);

      expect(response.body.error).toBe('Name, email, and password are required');
    });

    it('should return 400 when email is already in use', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123',
      };

      await request(app).post('/api/auth/register').send(userData);

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...userData,
          name: 'Another User',
        })
        .expect(400);

      expect(response.body.error).toBe('Email already in use');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      await prisma.user.create({
        data: {
          name: 'Test User',
          email: 'test@example.com',
          password: hashedPassword,
          role: 'USER',
        },
      });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(200);

      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user.password).toBeUndefined();
    });

    it('should return 400 when credentials are missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
        })
        .expect(400);

      expect(response.body.error).toBe('Email and password are required');
    });

    it('should return 404 when user does not exist', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
        .expect(404);

      expect(response.body.error).toBe('User not found');
    });

    it('should return 401 with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body.error).toBe('Invalid password');
    });
  });

  describe('POST /api/auth/verify-token', () => {
    let validToken: string;
    let userId: string;

    beforeEach(async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const user = await prisma.user.create({
        data: {
          name: 'Test User',
          email: 'test@example.com',
          password: hashedPassword,
          role: 'USER',
        },
      });
      userId = user.id;

      const loginResponse = await request(app).post('/api/auth/login').send({
        email: 'test@example.com',
        password: 'password123',
      });

      validToken = loginResponse.body.token;
    });

    it('should verify valid token', async () => {
      const response = await request(app)
        .post('/api/auth/verify-token')
        .send({ token: validToken })
        .expect(200);

      expect(response.body.valid).toBe(true);
      expect(response.body.user.id).toBe(userId);
      expect(response.body.user.email).toBe('test@example.com');
    });

    it('should return 400 when token is missing', async () => {
      const response = await request(app).post('/api/auth/verify-token').send({}).expect(400);

      expect(response.body.error).toBe('Token is required');
    });

    it('should return 401 for invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/verify-token')
        .send({ token: 'invalid.token.here' })
        .expect(401);

      expect(response.body.valid).toBe(false);
      expect(response.body.error).toBe('Invalid token');
    });
  });
});
