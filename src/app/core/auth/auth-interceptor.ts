import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, Subject, catchError, switchMap, take, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthService } from './auth';

// Stato di modulo (non nella classe): un solo ciclo di refresh alla volta per l'intera
// app, condiviso da tutte le richieste 401 concorrenti (es. più chiamate parallele allo
// scadere del token di accesso). `refreshed$` notifica l'esito (true/false) una tantum
// a ogni ciclo: i chiamanti in coda si limitano a un `take(1)`, niente stato residuo.
let isRefreshing = false;
const refreshed$ = new Subject<boolean>();

/**
 * Interceptor API.
 *
 * - Aggiunge `withCredentials: true` a tutte le chiamate verso l'apiBaseUrl
 *   in modo che il browser invii automaticamente i cookie HttpOnly `sh_jwt`/`sh_refresh`.
 * - Su 401 di una chiamata autenticata (non login/refresh/logout) tenta prima un
 *   `POST /auth/refresh`: se va a buon fine ripete la richiesta originale in modo
 *   trasparente, altrimenti pulisce lo stato e redirige a /login (comportamento storico).
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const isApi = req.url.startsWith(environment.apiBaseUrl);
  const isAuthEndpoint = isApi && (
    req.url.endsWith('/auth/login') || req.url.endsWith('/auth/refresh') || req.url.endsWith('/auth/logout')
  );

  const outgoing = isApi ? req.clone({ withCredentials: true }) : req;

  return next(outgoing).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 401 && isApi && !isAuthEndpoint) {
        return handleUnauthorized(outgoing, next, auth, router, err);
      }
      return throwError(() => err);
    }),
  );
};

function handleUnauthorized(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  auth: AuthService,
  router: Router,
  originalError: HttpErrorResponse,
): Observable<HttpEvent<unknown>> {
  if (isRefreshing) {
    return refreshed$.pipe(
      take(1),
      switchMap((success) => (success ? next(req) : throwError(() => originalError))),
    );
  }

  isRefreshing = true;
  return auth.refresh().pipe(
    switchMap(() => {
      isRefreshing = false;
      refreshed$.next(true);
      return next(req);
    }),
    catchError(() => {
      isRefreshing = false;
      refreshed$.next(false);
      auth.clear();
      const returnUrl = router.url && router.url !== '/login' ? router.url : null;
      void router.navigate(['/login'], returnUrl ? { queryParams: { returnUrl } } : undefined);
      return throwError(() => originalError);
    }),
  );
}
