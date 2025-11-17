import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
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
    return this.http.get<OrdenEnsamble[]>(`${this.baseUrl}/Ensamble/cola`);
  }

  obtenerOrdenPorId(id: number): Observable<OrdenEnsamble> {
    return this.http.get<OrdenEnsamble>(`${this.baseUrl}/Ensamble/${id}`);
  }

  actualizarEstado(id: number, payload: ActualizarEstadoEnsamblePayload): Observable<OrdenEnsamble> {
    return this.http.patch<OrdenEnsamble>(`${this.baseUrl}/Ensamble/${id}/estado`, payload);
  }

  registrarAvance(id: number, payload: RegistrarAvanceEnsamblePayload): Observable<OrdenEnsamble> {
    return this.http.post<OrdenEnsamble>(`${this.baseUrl}/Ensamble/${id}/avance`, payload);
  }
}
