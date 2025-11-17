import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RegistrarVentaPayload, Venta } from '../models/venta';

@Injectable({ providedIn: 'root' })
export class VentasService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  obtenerVentas(): Observable<Venta[]> {
    return this.http.get<Venta[]>(`${this.baseUrl}/Ventas`);
  }

  obtenerVentaPorId(id: number): Observable<Venta> {
    return this.http.get<Venta>(`${this.baseUrl}/Ventas/${id}`);
  }

  registrarVenta(payload: RegistrarVentaPayload): Observable<Venta> {
    return this.http.post<Venta>(`${this.baseUrl}/Ventas`, payload);
  }
}
