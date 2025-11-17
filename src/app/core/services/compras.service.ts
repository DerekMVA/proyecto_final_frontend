import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Compra, CompraCrear } from '../models/compra';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ComprasService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  obtenerCompras(): Observable<Compra[]> {
    return this.http.get<Compra[]>(`${this.baseUrl}/Compras`);
  }

  obtenerCompraPorId(id: number): Observable<Compra> {
    return this.http.get<Compra>(`${this.baseUrl}/Compras/${id}`);
  }

  crearCompra(payload: CompraCrear): Observable<Compra> {
    return this.http.post<Compra>(`${this.baseUrl}/Compras`, payload);
  }

  actualizarEstadoCompra(id: number, estado: Compra['estado']): Observable<Compra> {
    return this.http.patch<Compra>(`${this.baseUrl}/Compras/${id}/estado`, { estado });
  }
}
