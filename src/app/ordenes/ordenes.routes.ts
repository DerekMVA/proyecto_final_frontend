import { Routes } from '@angular/router';
import { ListaOrdenes } from './components/lista-ordenes/lista-ordenes.component';
import { CrearOrden } from './components/crear-orden/crear-orden.component';

export const ORDENES_ROUTES: Routes = [
    { path: '', component: ListaOrdenes },
    { path: 'nueva', component: CrearOrden }
];