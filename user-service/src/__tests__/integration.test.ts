import request from 'supertest';
import app from './testApp';

describe('Integration Tests', () => {
  it('should complete full user workflow', async () => {
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Integration Test User',
        email: 'integration@test.com',
        password: 'Password123',
      })
      .expect(201);

    const userId = registerResponse.body.user.id;

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'integration@test.com',
        password: 'Password123',
      })
      .expect(200);

    const token = loginResponse.body.token;
    expect(token).toBeDefined();

    await request(app).post('/api/auth/verify-token').send({ token }).expect(200);

    const getUserResponse = await request(app).get(`/api/users/${userId}`).expect(200);

    expect(getUserResponse.body.email).toBe('integration@test.com');

    await request(app)
      .patch(`/api/users/${userId}`)
      .send({ name: 'Updated Integration User' })
      .expect(200);

    const updatedUserResponse = await request(app).get(`/api/users/${userId}`).expect(200);

    expect(updatedUserResponse.body.name).toBe('Updated Integration User');

    await request(app).delete(`/api/users/${userId}`).expect(200);

    await request(app).get(`/api/users/${userId}`).expect(404);
  });

  it('should handle error cases properly', async () => {
    const userData = {
      name: 'Test User',
      email: 'duplicate@test.com',
      password: 'Password123',
    };

    await request(app).post('/api/auth/register').send(userData).expect(201);

    await request(app).post('/api/auth/register').send(userData).expect(400);

    await request(app)
      .post('/api/auth/login')
      .send({
        email: 'duplicate@test.com',
        password: 'WrongPassword',
      })
      .expect(401);
  });
});
