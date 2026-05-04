import { Routes } from '@angular/router';

export const installationsRoutes: Routes = [
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/installation-detail-page/installation-detail-page').then(
        (m) => m.InstallationDetailPage,
      ),
    title: 'Dettaglio installation',
  },
];
