import { Route } from "@angular/router";
import { ColaMantenimiento } from "./components/cola-mantenimiento/cola-mantenimiento.component";
import { DiagnosticoReparacion } from "./components/diagnostico-reparacion/diagnostico-reparacion.component";

export const MANTENIMIENTO_ROUTES: Route[] = [
    {path: '', component: ColaMantenimiento },
    {path: 'diagnostico', component: DiagnosticoReparacion }
];  