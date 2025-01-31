import { fetchApi } from './api';
import type { LoginResponse, RegisterResponse } from '../components/types/auth';

export const authService = {
  login: async (email: string, password: string) => {
    const response = await fetchApi<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (response.data) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response;
  },
  
    register: async (username: string, email: string, password: string) => {
      return fetchApi<RegisterResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ 
          name: username,
          email, 
          password 
        }),
      });
    },
};