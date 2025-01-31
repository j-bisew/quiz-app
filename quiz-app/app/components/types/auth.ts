export interface SignInData {
    email: string;
    password: string;
}
  
export interface SignUpData {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
  }
  
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export enum UserRole {
  USER = 'USER',
  MODERATOR = 'MODERATOR',
  ADMIN = 'ADMIN'
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface RegisterResponse {
  message: string;
  user: User;
}

export interface UserUpdateInput {
  name?: string;
  email?: string;
  password?: string;
}

export interface RoleUpdateInput {
  role: UserRole;
}