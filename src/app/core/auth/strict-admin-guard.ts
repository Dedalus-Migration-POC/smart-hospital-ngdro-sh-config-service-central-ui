import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth';

/**
 * Consente l'accesso solo al ruolo ADMIN (a differenza di adminOnlyGuard, che permette
 * anche DELIVERY). Usato per sezioni riservate esclusivamente all'ADMIN, come la lista utenti.
 */
export const strictAdminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.currentUser();
  if (user?.role !== 'ADMIN') {
    return router.createUrlTree(['/']);
  }
  return true;
};
