import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import {
  AUTH_TOKEN_EXPIRES_AT_KEY,
  AUTH_TOKEN_KEY,
  CurrentUser,
  LoginRequest,
  LoginResponse,
  MeResponse,
} from './models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly _currentUser = signal<CurrentUser | null>(null);
  readonly currentUser = this._currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this._currentUser() !== null);

  /** Token grezzo da localStorage (usato dall'interceptor). */
  getToken(): string | null {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  }

  /**
   * POST /auth/login → salva token + idrata l'utente con /auth/me.
   * In caso di errore di rete o credenziali ko, lo stato resta vuoto e
   * l'errore viene rilanciato perché il chiamante (login page) lo mostri.
   */
  login(credentials: LoginRequest): Observable<CurrentUser> {
    return this.http
      .post<LoginResponse>(`${environment.apiBaseUrl}/auth/login`, credentials)
      .pipe(
        tap((res) => this.persistToken(res.token, res.expiresAt)),
        switchMap(() => this.fetchMe()),
        catchError((err) => {
          this.clear();
          return throwError(() => err);
        }),
      );
  }

  /**
   * GET /auth/me — usato sia dopo login che dal guard per idratare il signal
   * quando in localStorage c'è un token ma il service è appena ripartito (refresh).
   */
  fetchMe(): Observable<CurrentUser> {
    return this.http.get<MeResponse>(`${environment.apiBaseUrl}/auth/me`).pipe(
      tap((me) => this._currentUser.set({ id: me.id, username: me.username, role: me.role, customerId: me.customerId })),
    );
  }

  /** Logout esplicito (bottone). Pulisce stato e va al login. */
  logout(): void {
    this.clear();
    void this.router.navigateByUrl('/login');
  }

  /** Pulisce stato senza navigare — usato anche dall'interceptor su 401. */
  clear(): void {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_TOKEN_EXPIRES_AT_KEY);
    this._currentUser.set(null);
  }

  private persistToken(token: string, expiresAt: string): void {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(AUTH_TOKEN_EXPIRES_AT_KEY, expiresAt);
  }
}
