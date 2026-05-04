import { Routes } from '@angular/router';

export const usersRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/users-page/users-page').then((m) => m.UsersPage),
    title: 'Utenti — Configuratore centrale',
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/user-detail-page/user-detail-page').then((m) => m.UserDetailPage),
    title: 'Dettaglio utente',
  },
];
