import { Routes } from '@angular/router';
import { InventarioGeneral } from './components/inventario-general/inventario-general.component';
import { ProductoDetalle } from './components/producto-detalle/producto-detalle.component';
import { AjusteInventario } from './components/ajuste-inventario/ajuste-inventario.component';

export const INVENTARIO_ROUTES: Routes = [
    { path: '', component: InventarioGeneral },
    {
        path: 'detalle/:id',
        component: ProductoDetalle,
        data: {
            prerender: false
        }
    },
    { path: 'ajuste', component: AjusteInventario }
];