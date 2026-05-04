export interface User {
  id: string;
  username: string;
  role: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserCreateRequest {
  username: string;
  password: string;
  role: string;
}

export interface UserUpdateRequest {
  role?: string;
  active?: boolean;
}

export interface UserPasswordUpdateRequest {
  currentPassword?: string;
  newPassword: string;
}

export const AVAILABLE_ROLES = ['ADMIN'] as const;
export type UserRole = (typeof AVAILABLE_ROLES)[number];

export const USERNAME_PATTERN = /^[a-zA-Z0-9._-]+$/;
