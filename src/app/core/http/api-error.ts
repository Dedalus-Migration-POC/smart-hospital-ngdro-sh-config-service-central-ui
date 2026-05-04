import { HttpErrorResponse } from '@angular/common/http';

/** Shape uniforme delle risposte di errore del backend (vedi GlobalExceptionHandler lato Java). */
export interface ApiError {
  error: string;
  timestamp?: string;
  fieldErrors?: Record<string, string>;
}

/**
 * Estrae un messaggio utente da un errore HTTP.
 * In ordine: status 0 → "backend non raggiungibile"; body shape `{error}` → quel testo;
 * body string non vuoto → quella string; altrimenti il fallback.
 */
export function toUserMessage(err: unknown, fallback = 'Errore inatteso.'): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) {
      return 'Backend non raggiungibile.';
    }
    const body = err.error as ApiError | string | null | undefined;
    if (body && typeof body === 'object' && typeof body.error === 'string') {
      return body.error;
    }
    if (typeof body === 'string' && body.length > 0) {
      return body;
    }
  }
  return fallback;
}
