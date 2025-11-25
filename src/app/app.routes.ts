import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'inventario',
    loadChildren: () => import('./inventario/inventario.routes').then(r => r.INVENTARIO_ROUTES),
    data: {
      prerender: false
    }
  },
  {
    path: 'entradas',
    loadChildren: () => import('./entradas/entradas.routes').then(r => r.ENTRADAS_ROUTES),
    data: {
      prerender: false
    }
  },
  {
    path: 'salidas',
    loadChildren: () => import('./salidas/salidas.routes').then(r => r.SALIDAS_ROUTES),
    data: {
      prerender: false
    }
  },
  {
    path: 'ordenes',
    loadChildren: () => import('./ordenes/ordenes.routes').then(r => r.ORDENES_ROUTES),
    data: {
      prerender: false
    }
  },
  {
    path: 'ensamble',
    loadChildren: () => import('./ensamble/ensamble.routes').then(r => r.ENSAMBLE_ROUTES),
    data: {
      prerender: false
    }
  },
  {
    path: 'mantenimiento',
    loadChildren: () => import('./mantenimiento/mantenimiento.routes').then(r => r.MANTENIMIENTO_ROUTES),
    data: {
      prerender: false
    }
  },
  {
    path: 'admin',
    loadChildren: () => import('./admin/admin.routes').then(r => r.ADMIN_ROUTES),
    data: {
      prerender: false
    }
  },
  {
    path: '',
    redirectTo: 'admin',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'admin'
  }
];