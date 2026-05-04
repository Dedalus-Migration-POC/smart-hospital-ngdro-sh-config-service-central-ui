import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthService } from './auth';

/**
 * Interceptor JWT.
 *
 * - Attacca `Authorization: Bearer <token>` a tutte le chiamate verso
 *   l'apiBaseUrl, eccetto la login (che il token non ce l'ha ancora).
 * - Su 401 di una chiamata autenticata pulisce lo stato e redirige a /login,
 *   passando il path corrente come query param `returnUrl`. Sulla login
 *   stessa il 401 indica credenziali ko: lo lasciamo passare al chiamante.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const isApi = req.url.startsWith(environment.apiBaseUrl);
  const isLogin = isApi && req.url.endsWith('/auth/login');

  let outgoing = req;
  if (isApi && !isLogin) {
    const token = auth.getToken();
    if (token) {
      outgoing = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` },
      });
    }
  }

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
