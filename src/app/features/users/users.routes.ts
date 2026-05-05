import { Routes } from '@angular/router';

import { adminOnlyGuard } from '../../core/auth/admin-guard';

export const usersRoutes: Routes = [
  {
    path: '',
    canActivate: [adminOnlyGuard],
    loadComponent: () =>
      import('./pages/users-page/users-page').then((m) => m.UsersPage),
    title: 'Utenti — Configuratore centrale',
  },
  {
    path: ':id',
    canActivate: [adminOnlyGuard],
    loadComponent: () =>
      import('./pages/user-detail-page/user-detail-page').then((m) => m.UserDetailPage),
    title: 'Dettaglio utente',
  },
];
