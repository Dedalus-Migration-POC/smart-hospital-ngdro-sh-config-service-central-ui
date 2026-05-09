import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { CurrentUser, LoginRequest, LoginResponse, MeResponse } from './models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly _currentUser = signal<CurrentUser | null>(null);
  readonly currentUser = this._currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this._currentUser() !== null);

  /**
   * POST /auth/login → il backend imposta il cookie HttpOnly `sh_jwt`.
   * Subito dopo idrata il signal con /auth/me.
   */
  login(credentials: LoginRequest): Observable<CurrentUser> {
    return this.http
      .post<LoginResponse>(`${environment.apiBaseUrl}/auth/login`, credentials, { withCredentials: true })
      .pipe(
        switchMap(() => this.fetchMe()),
        catchError((err) => {
          this._currentUser.set(null);
          return throwError(() => err);
        }),
      );
  }

  /**
   * GET /auth/me — idrata il signal. Il browser invia il cookie automaticamente.
   * Usato dal guard al refresh della pagina e dopo il login.
   */
  fetchMe(): Observable<CurrentUser> {
    return this.http.get<MeResponse>(`${environment.apiBaseUrl}/auth/me`, { withCredentials: true }).pipe(
      tap((me) => this._currentUser.set({ id: me.id, username: me.username, role: me.role, customerId: me.customerId })),
    );
  }

  /** Logout esplicito: invalida il cookie lato server e pulisce lo stato. */
  logout(): void {
    this.http.post(`${environment.apiBaseUrl}/auth/logout`, {}, { withCredentials: true }).subscribe({
      complete: () => {
        this._currentUser.set(null);
        void this.router.navigateByUrl('/login');
      },
      error: () => {
        this._currentUser.set(null);
        void this.router.navigateByUrl('/login');
      },
    });
  }

  /** Pulisce stato senza navigare — usato dall'interceptor su 401. */
  clear(): void {
    this._currentUser.set(null);
  }
}
