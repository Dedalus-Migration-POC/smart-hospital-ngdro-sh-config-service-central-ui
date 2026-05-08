import { Routes } from '@angular/router';

export const notificationsRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/notifications-page/notifications-page').then((m) => m.NotificationsPage),
    title: 'Le mie notifiche — Configuratore centrale',
  },
];
