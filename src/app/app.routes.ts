import { Routes } from '@angular/router';

import { authGuard } from './core/auth/auth-guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/pages/login-page/login-page').then((m) => m.LoginPage),
    title: 'Accesso — Configuratore centrale',
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/admin-shell/admin-shell').then((m) => m.AdminShell),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./features/home/pages/home-page/home-page').then((m) => m.HomePage),
        title: 'Configuratore centrale',
      },
      {
        path: 'customers',
        loadChildren: () =>
          import('./features/customers/customers.routes').then((m) => m.customersRoutes),
      },
      {
        path: 'installations',
        loadChildren: () =>
          import('./features/installations/installations.routes').then((m) => m.installationsRoutes),
      },
      {
        path: 'prodotti',
        loadChildren: () =>
          import('./features/tenants/tenants.routes').then((m) => m.tenantsRoutes),
      },
      {
        path: 'users',
        loadChildren: () =>
          import('./features/users/users.routes').then((m) => m.usersRoutes),
      },
      {
        path: 'audit',
        loadChildren: () =>
          import('./features/audit/audit.routes').then((m) => m.auditRoutes),
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
