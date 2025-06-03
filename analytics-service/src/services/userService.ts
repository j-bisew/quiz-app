interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface VerifyTokenResponse {
  valid: boolean;
  user?: User;
  error?: string;
}

export class UserService {
  private static readonly USER_SERVICE_URL =
    process.env.USER_SERVICE_URL || 'http://localhost:3001';

  static async verifyToken(token: string): Promise<VerifyTokenResponse> {
    try {
      const response = await fetch(`${this.USER_SERVICE_URL}/api/auth/verify-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { valid: false, error: (data as any)?.error || 'Token verification failed' };
      }

      return data as VerifyTokenResponse;
    } catch (error) {
      console.error('Error verifying token with user-service:', error);
      return { valid: false, error: 'User service unavailable' };
    }
  }

  static async getUserById(userId: string): Promise<User | null> {
    try {
      const response = await fetch(`${this.USER_SERVICE_URL}/api/users/${userId}`);

      if (!response.ok) {
        return null;
      }

      return (await response.json()) as User;
    } catch (error) {
      console.error('Error fetching user from user-service:', error);
      return null;
    }
  }
}
