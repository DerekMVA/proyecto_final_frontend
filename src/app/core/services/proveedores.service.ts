import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Proveedor } from '../models/proveedor';
import { environment } from '../../../environments/environment';

export interface ProveedorUpsert {
  nombre: string;
  contacto?: string | null;
  telefono?: string | null;
  correo?: string | null;
  direccion?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ProveedoresService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;
  private readonly resourceUrl = `${this.baseUrl}/Proveedores`;

  obtenerProveedores(): Observable<Proveedor[]> {
    return this.http.get<Proveedor[]>(this.resourceUrl);
  }

  obtenerProveedorPorId(id: number): Observable<Proveedor> {
    return this.http.get<Proveedor>(`${this.resourceUrl}/${id}`);
  }

  crearProveedor(payload: ProveedorUpsert): Observable<Proveedor> {
    return this.http.post<Proveedor>(this.resourceUrl, payload);
  }

  actualizarProveedor(id: number, payload: ProveedorUpsert): Observable<void> {
    return this.http.put<void>(`${this.resourceUrl}/${id}`, { id, ...payload });
  }

  eliminarProveedor(id: number): Observable<void> {
    return this.http.delete<void>(`${this.resourceUrl}/${id}`);
  }

  restaurarProveedor(id: number): Observable<void> {
    return this.http.post<void>(`${this.resourceUrl}/${id}/restaurar`, {});
  }
}
