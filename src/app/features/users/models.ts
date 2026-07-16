export interface User {
  id: string;
  username: string;
  role: string;
  customerId?: string | null;
  deliveryCustomerIds: string[];
  active: boolean;
  notificationsEnabled: boolean;
  notificationCustomerIds: string[];
  notificationPollIntervalMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserCreateRequest {
  username: string;
  password: string;
  role: string;
  customerId?: string | null;
  deliveryCustomerIds?: string[];
}

export interface UserUpdateRequest {
  role?: string;
  active?: boolean;
  customerId?: string | null;
  deliveryCustomerIds?: string[];
}

export interface UserPasswordUpdateRequest {
  currentPassword?: string;
  newPassword: string;
}

export interface UserNotificationRequest {
  notificationsEnabled: boolean;
  notificationCustomerIds: string[];
  pollIntervalMinutes: number;
}

export interface NotificationLog {
  id: string;
  installationId: string;
  installationName: string;
  status: 'SENT' | 'FAILED' | 'DRY_RUN';
  type: 'EMAIL' | 'PUSH';
  recipient: string | null;
  subject: string | null;
  body: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export const AVAILABLE_ROLES = ['ADMIN', 'CUSTOMER', 'DELIVERY'] as const;
export type UserRole = (typeof AVAILABLE_ROLES)[number];
