import { Routes } from '@angular/router';
import { ListaCompras } from './components/lista-compras/lista-compras';
import { RegistrarCompra } from './components/registrar-compra/registrar-compra';
import { GestionProveedores } from './components/gestion-proveedores/gestion-proveedores';
import { DetalleCompra } from './components/detalle-compra/detalle-compra';

export const ENTRADAS_ROUTES: Routes = [
    { path: '', component: ListaCompras },
    { path: 'detalle/:id', component: DetalleCompra },
    { path: 'nueva', component: RegistrarCompra },
    { path: 'proveedores', component: GestionProveedores }
];