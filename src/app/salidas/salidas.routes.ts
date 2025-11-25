import { Routes } from '@angular/router';
import { ListaVentas } from './components/lista-ventas/lista-ventas.component';
import { RegistrarVenta } from './components/registrar-venta/registrar-venta.component';
import { GestionClientes } from './components/gestion-clientes/gestion-clientes.component';

export const SALIDAS_ROUTES: Routes = [
    { path: '', component: ListaVentas },
    { path: 'nueva', component: RegistrarVenta },
    { path: 'clientes', component: GestionClientes }
];