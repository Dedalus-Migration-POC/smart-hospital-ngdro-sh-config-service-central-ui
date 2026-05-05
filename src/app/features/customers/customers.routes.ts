import { Routes } from '@angular/router';

import { adminOnlyGuard } from '../../core/auth/admin-guard';

export const customersRoutes: Routes = [
  {
    path: '',
    canActivate: [adminOnlyGuard],
    loadComponent: () =>
      import('./pages/customers-page/customers-page').then((m) => m.CustomersPage),
    title: 'Customer',
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/customer-detail-page/customer-detail-page').then((m) => m.CustomerDetailPage),
    title: 'Dettaglio customer',
  },
];
