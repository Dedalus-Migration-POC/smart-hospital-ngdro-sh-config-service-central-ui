import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth';

/**
 * Permette l'accesso se l'utente è ADMIN, oppure se sta accedendo al proprio profilo
 * (route con param :id uguale all'id dell'utente corrente).
 * Usato su /users/:id per permettere al CUSTOMER di vedere/modificare solo se stesso.
 */
export const selfOrAdminGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.currentUser();

  if (!user) return router.createUrlTree(['/login']);
  if (user.role === 'ADMIN') return true;

  const targetId = route.paramMap.get('id');
  if (targetId === user.id) return true;

  return router.createUrlTree(
    user.customerId ? ['/customers', user.customerId] : ['/'],
  );
};
