import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { AuthService } from './auth';

/**
 * Guard per le route autenticate.
 *
 * - Signal già popolato → lascia passare.
 * - Altrimenti chiama /auth/me: il browser invia il cookie automaticamente.
 *   Su 200 idrata e lascia passare; su errore (cookie scaduto/assente)
 *   redirige a /login con returnUrl.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) return true;

  return auth.fetchMe().pipe(
    map(() => true),
    catchError(() => of(router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } }))),
  );
};
