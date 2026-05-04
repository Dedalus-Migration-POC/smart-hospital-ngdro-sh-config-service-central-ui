export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  expiresAt: string;
}

export interface MeResponse {
  username: string;
  role: string | null;
}

export interface CurrentUser {
  username: string;
  role: string | null;
}

/** Shape uniforme degli errori dal backend (vedi GlobalExceptionHandler). */
export interface ApiError {
  error: string;
  timestamp?: string;
  fieldErrors?: Record<string, string>;
}

export const AUTH_TOKEN_KEY = 'sh.cs.authToken';
export const AUTH_TOKEN_EXPIRES_AT_KEY = 'sh.cs.authTokenExpiresAt';
