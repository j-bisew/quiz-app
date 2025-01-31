import { fetchApi } from './api';
import { User, UserUpdateInput, UserRole } from '../components/types/auth';

export async function getUser(id: string) {
  return fetchApi<User>(`/users/${id}`);
}

export async function updateUser(id: string, data: UserUpdateInput) {
  return fetchApi<User>(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteUser(id: string) {
  return fetchApi<{ message: string }>(`/users/${id}`, {
    method: 'DELETE',
  });
}

export async function deleteUserByEmail(email: string) {
  return fetchApi<{ message: string }>(`/users/email/${email}`, {
    method: 'DELETE',
  });
}

export async function updateUserRole(email: string, data: { role: UserRole }) {
  return fetchApi<User>(`/users/email/${email}/role`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}