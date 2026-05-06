export interface LoginRequest {
  username: string;
  password: string;
  captchaToken: string;
}

export interface LoginResponse {
  token: string;
  expiresAt: string;
}

export interface MeResponse {
  username: string;
  role: string | null;
  customerId?: string | null;
}

export interface CurrentUser {
  username: string;
  role: string | null;
  customerId?: string | null;
}

export const AUTH_TOKEN_KEY = 'sh.cs.authToken';
export const AUTH_TOKEN_EXPIRES_AT_KEY = 'sh.cs.authTokenExpiresAt';
