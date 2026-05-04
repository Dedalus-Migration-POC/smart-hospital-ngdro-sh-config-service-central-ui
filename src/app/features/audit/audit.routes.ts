import { Routes } from '@angular/router';

export const auditRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/audit-page/audit-page').then((m) => m.AuditPage),
    title: 'Audit log — Configuratore centrale',
  },
];
