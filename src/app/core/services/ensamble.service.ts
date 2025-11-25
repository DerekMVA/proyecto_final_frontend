import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ActualizarEstadoEnsamblePayload,
  OrdenEnsamble,
  RegistrarAvanceEnsamblePayload
} from '../models/ensamble';

@Injectable({ providedIn: 'root' })
export class EnsambleService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  obtenerCola(): Observable<OrdenEnsamble[]> {
    return this.http.get<OrdenEnsamble[]>(`${this.baseUrl}/OrdenesEnsambles`);
  }

  obtenerOrdenPorId(id: number): Observable<OrdenEnsamble> {
    return this.http.get<OrdenEnsamble>(`${this.baseUrl}/OrdenesEnsambles/${id}`);
  }

  actualizarEstado(id: number, payload: ActualizarEstadoEnsamblePayload): Observable<OrdenEnsamble> {
    return this.actualizarOrden(id, orden => ({
      ...orden,
      estado: payload.estado,
      notas: payload.notas ?? orden.notas
    }));
  }

  registrarAvance(id: number, payload: RegistrarAvanceEnsamblePayload): Observable<OrdenEnsamble> {
    return this.actualizarOrden(id, orden => {
      const componentesActualizados = payload.componentesCompletados?.length
        ? (orden.componentes ?? []).map(componente => ({
            ...componente,
            instalado: payload.componentesCompletados.includes(componente.id) ? true : componente.instalado
          }))
        : orden.componentes;

      return {
        ...orden,
        notas: payload.notas ?? orden.notas,
        pruebasRealizadas: payload.pruebasRealizadas ?? orden.pruebasRealizadas,
        componentes: componentesActualizados,
        estado: payload.estadoObjetivo ?? orden.estado
      };
    });
  }

  private actualizarOrden(
    id: number,
    updater: (orden: OrdenEnsamble) => OrdenEnsamble
  ): Observable<OrdenEnsamble> {
    return this.obtenerOrdenPorId(id).pipe(
      switchMap(orden => {
        const actualizado = updater(orden);
        return this.http.put<OrdenEnsamble>(`${this.baseUrl}/OrdenesEnsambles/${id}`, actualizado);
      })
    );
  }
}
