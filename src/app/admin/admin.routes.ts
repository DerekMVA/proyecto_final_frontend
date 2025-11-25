import { Routes } from '@angular/router';
import { DashboardReportes } from './components/dashboard-reportes/dashboard-reportes.component';
import { GestionUsuarios } from './components/gestion-usuarios/gestion-usuarios.component';

export const ADMIN_ROUTES: Routes = [
        { path: '', component: DashboardReportes },
    { path: 'usuarios', component: GestionUsuarios }
];