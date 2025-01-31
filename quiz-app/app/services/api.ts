const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export function getAuthToken() {
  return localStorage.getItem('token');
}

export async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<{ data?: T; error?: string }> {
  try {
    const token = getAuthToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 204) {
      return { data: undefined };
    }

    const data = await response.json();

    if (!response.ok) {
      return { error: data.message };
    }

    return { data: data as T };
  } catch (error) {
    console.error('API error:', error);
    return { 
      error: error instanceof Error ? error.message : 'An error occurred' 
    };
  }
}
