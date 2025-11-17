import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AjusteInventarioPayload, InventarioItem } from '../models/inventario';

@Injectable({ providedIn: 'root' })
export class InventarioService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  obtenerInventario(): Observable<InventarioItem[]> {
    return this.http.get<InventarioItem[]>(`${this.baseUrl}/Inventario`);
  }

  obtenerProductoPorId(id: number): Observable<InventarioItem> {
    return this.http.get<InventarioItem>(`${this.baseUrl}/Inventario/${id}`);
  }

  registrarAjuste(payload: AjusteInventarioPayload): Observable<InventarioItem> {
    return this.http.post<InventarioItem>(`${this.baseUrl}/Inventario/${payload.idProducto}/ajustes`, payload);
  }
}
