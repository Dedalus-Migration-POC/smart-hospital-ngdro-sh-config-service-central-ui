import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { AuthService } from './auth';

/**
 * Guard per le route autenticate.
 *
 * - Se il signal currentUser è già popolato → lascia passare.
 * - Se in localStorage c'è un token ma lo stato non è ancora idratato
 *   (caso classico: refresh della pagina), chiama /auth/me. Su 200 idrata
 *   e lascia passare; su errore l'interceptor avrà gia` ripulito tutto e
 *   noi ridirezioniamo a /login.
 * - Senza token → redirect a /login con returnUrl per tornare dove voleva andare.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  if (auth.getToken()) {
    return auth.fetchMe().pipe(
      map(() => true),
      catchError(() => of(router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } }))),
    );
  }

  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
