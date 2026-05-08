export interface User {
  id: string;
  username: string;
  role: string;
  customerId?: string | null;
  active: boolean;
  notificationsEnabled: boolean;
  notificationCustomerIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface UserCreateRequest {
  username: string;
  password: string;
  role: string;
  customerId?: string | null;
}

export interface UserUpdateRequest {
  role?: string;
  active?: boolean;
  customerId?: string | null;
}

export interface UserPasswordUpdateRequest {
  currentPassword?: string;
  newPassword: string;
}

export interface UserNotificationRequest {
  notificationsEnabled: boolean;
  notificationCustomerIds: string[];
}

export const AVAILABLE_ROLES = ['ADMIN', 'CUSTOMER'] as const;
export type UserRole = (typeof AVAILABLE_ROLES)[number];
