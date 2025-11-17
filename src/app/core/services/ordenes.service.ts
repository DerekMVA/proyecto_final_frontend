import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CrearOrdenPayload, OrdenTrabajo } from '../models/orden';

@Injectable({ providedIn: 'root' })
export class OrdenesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  obtenerOrdenes(): Observable<OrdenTrabajo[]> {
    return this.http.get<OrdenTrabajo[]>(`${this.baseUrl}/Ordenes`);
  }

  crearOrden(payload: CrearOrdenPayload): Observable<OrdenTrabajo> {
    return this.http.post<OrdenTrabajo>(`${this.baseUrl}/Ordenes`, payload);
  }
}
