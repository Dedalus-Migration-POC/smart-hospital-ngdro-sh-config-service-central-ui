import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth';

export const adminOnlyGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.currentUser();
  if (user?.role === 'CUSTOMER') {
    return router.createUrlTree(
      user.customerId ? ['/customers', user.customerId] : ['/'],
    );
  }
  return true;
};
