import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AjusteInventarioPayload, InventarioItem } from '../models/inventario';

@Injectable({ providedIn: 'root' })
export class InventarioService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  obtenerInventario(): Observable<InventarioItem[]> {
    return this.http.get<InventarioItem[]>(`${this.baseUrl}/Productos`);
  }

  obtenerProductoPorId(id: number): Observable<InventarioItem> {
    return this.http.get<InventarioItem>(`${this.baseUrl}/Productos/${id}`);
  }

  registrarAjuste(payload: AjusteInventarioPayload): Observable<InventarioItem> {
    return this.obtenerProductoPorId(payload.idProducto).pipe(
      switchMap(producto => {
        const actualizado: InventarioItem = {
          ...producto,
          stockActual: payload.cantidadNueva,
          actualizado: new Date().toISOString()
        };
        return this.http.put<InventarioItem>(`${this.baseUrl}/Productos/${payload.idProducto}`, actualizado);
      })
    );
  }
}
