import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthService } from './auth';

/**
 * Interceptor API.
 *
 * - Aggiunge `withCredentials: true` a tutte le chiamate verso l'apiBaseUrl
 *   in modo che il browser invii automaticamente il cookie HttpOnly `sh_jwt`.
 * - Su 401 di una chiamata autenticata pulisce lo stato e redirige a /login.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const isApi = req.url.startsWith(environment.apiBaseUrl);
  const isLogin = isApi && req.url.endsWith('/auth/login');

  const outgoing = isApi ? req.clone({ withCredentials: true }) : req;

  return next(outgoing).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 401 && !isLogin) {
        auth.clear();
        const returnUrl = router.url && router.url !== '/login' ? router.url : null;
        void router.navigate(['/login'], returnUrl ? { queryParams: { returnUrl } } : undefined);
      }
      return throwError(() => err);
    }),
  );
};
