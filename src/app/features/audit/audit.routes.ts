import { Routes } from '@angular/router';

import { adminOnlyGuard } from '../../core/auth/admin-guard';

export const auditRoutes: Routes = [
  {
    path: '',
    canActivate: [adminOnlyGuard],
    loadComponent: () =>
      import('./pages/audit-page/audit-page').then((m) => m.AuditPage),
    title: 'Audit log — Configuratore centrale',
  },
];
