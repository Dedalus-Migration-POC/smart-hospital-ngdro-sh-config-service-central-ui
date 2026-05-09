export interface LoginRequest {
  username: string;
  password: string;
  captchaToken: string;
}

export interface LoginResponse {
  expiresAt: string;
}

export interface MeResponse {
  id: string;
  username: string;
  role: string | null;
  customerId?: string | null;
}

export interface CurrentUser {
  id: string;
  username: string;
  role: string | null;
  customerId?: string | null;
}
