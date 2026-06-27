import { Routes } from '@angular/router';

export const pushNotificationsRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/push-page/push-page').then((m) => m.PushPage),
    title: 'Notifiche Push — Configuratore centrale',
  },
];
