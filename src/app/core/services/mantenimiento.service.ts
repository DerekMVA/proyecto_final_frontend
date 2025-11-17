import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ActualizarEstadoPayload, AsignarTecnicoPayload, RegistrarReparacionPayload, TicketMantenimiento } from '../models/mantenimiento';

@Injectable({ providedIn: 'root' })
export class MantenimientoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  obtenerColaMantenimiento(): Observable<TicketMantenimiento[]> {
    return this.http.get<TicketMantenimiento[]>(`${this.baseUrl}/Mantenimiento/cola`);
  }

  obtenerTicketPorId(id: number): Observable<TicketMantenimiento> {
    return this.http.get<TicketMantenimiento>(`${this.baseUrl}/Mantenimiento/${id}`);
  }

  actualizarEstadoTicket(id: number, payload: ActualizarEstadoPayload): Observable<TicketMantenimiento> {
    return this.http.patch<TicketMantenimiento>(`${this.baseUrl}/Mantenimiento/${id}/estado`, payload);
  }

  asignarTecnico(id: number, payload: AsignarTecnicoPayload): Observable<TicketMantenimiento> {
    return this.http.patch<TicketMantenimiento>(`${this.baseUrl}/Mantenimiento/${id}/asignacion`, payload);
  }

  registrarReparacion(id: number, payload: RegistrarReparacionPayload): Observable<TicketMantenimiento> {
    return this.http.post<TicketMantenimiento>(`${this.baseUrl}/Mantenimiento/${id}/reparacion`, payload);
  }
}
