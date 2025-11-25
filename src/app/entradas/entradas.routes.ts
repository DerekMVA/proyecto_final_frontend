import { Routes } from '@angular/router';
import { ListaCompras } from './components/lista-compras/lista-compras.component';
import { RegistrarCompra } from './components/registrar-compra/registrar-compra.component';
import { GestionProveedores } from './components/gestion-proveedores/gestion-proveedores.component';
import { DetalleCompra } from './components/detalle-compra/detalle-compra.component';

export const ENTRADAS_ROUTES: Routes = [
    { path: '', component: ListaCompras },
    {
        path: 'detalle/:id',
        component: DetalleCompra,
        data: {
            prerender: false
        }
    },
    { path: 'nueva', component: RegistrarCompra },
    { path: 'proveedores', component: GestionProveedores }
];