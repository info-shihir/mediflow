import {Routes} from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard',
  },
  {
    path: 'login',
    loadComponent: () => import('./features/login/login.component').then((m) => m.Login),
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then((m) => m.Dashboard),
  },
  {
    path: 'pos',
    loadComponent: () => import('./features/pos/pos.component').then((m) => m.Pos),
  },
  {
    path: 'inventory',
    loadComponent: () =>
      import('./features/inventory/inventory').then((m) => m.Inventory),
  },
  {
    path: 'prescriptions',
    loadComponent: () =>
      import('./features/prescriptions/prescriptions').then(
        (m) => m.Prescriptions,
      ),
  },
  {
    path: 'purchases',
    loadComponent: () =>
      import('./features/purchases/purchases.component').then((m) => m.Purchases),
  },
  {
    path: 'reorder',
    loadComponent: () =>
      import('./features/reorder/reorder.component').then((m) => m.Reorder),
  },
  {
    path: 'returns',
    loadComponent: () =>
      import('./features/returns/returns.component').then((m) => m.Returns),
  },
  {
    path: 'copilot',
    loadComponent: () =>
      import('./features/copilot/copilot.component').then((m) => m.Copilot),
  },
  {
    path: 'branches',
    loadComponent: () =>
      import('./features/branches/branches.component').then((m) => m.Branches),
  },
  {
    path: 'audit',
    loadComponent: () =>
      import('./features/audit/audit.component').then((m) => m.Audit),
  },
  {
    path: 'access',
    loadComponent: () =>
      import('./features/access/access.component').then((m) => m.Access),
  },
  {
    path: 'reports',
    loadComponent: () =>
      import('./features/reports/reports.component').then((m) => m.Reports),
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./features/settings/settings.component').then((m) => m.Settings),
  },
  {
    path: 'profile',
    loadComponent: () =>
      import('./features/profile/profile').then((m) => m.Profile),
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
