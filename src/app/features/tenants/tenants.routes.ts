import { Routes } from '@angular/router';

export const tenantsRoutes: Routes = [
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/tenant-detail-page/tenant-detail-page').then((m) => m.TenantDetailPage),
    title: 'Dettaglio prodotto',
  },
];
