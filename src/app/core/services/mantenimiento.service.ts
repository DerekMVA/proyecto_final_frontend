import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ActualizarEstadoPayload, AsignarTecnicoPayload, RegistrarReparacionPayload, TicketMantenimiento } from '../models/mantenimiento';

@Injectable({ providedIn: 'root' })
export class MantenimientoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  obtenerColaMantenimiento(): Observable<TicketMantenimiento[]> {
    return this.http.get<TicketMantenimiento[]>(`${this.baseUrl}/Reparaciones`);
  }

  obtenerTicketPorId(id: number): Observable<TicketMantenimiento> {
    return this.http.get<TicketMantenimiento>(`${this.baseUrl}/Reparaciones/${id}`);
  }

  actualizarEstadoTicket(id: number, payload: ActualizarEstadoPayload): Observable<TicketMantenimiento> {
    return this.actualizarTicket(id, ticket => ({
      ...ticket,
      estado: payload.estado,
      observaciones: payload.observaciones ?? ticket.observaciones,
      ultimoMovimiento: new Date().toISOString()
    }));
  }

  asignarTecnico(id: number, payload: AsignarTecnicoPayload): Observable<TicketMantenimiento> {
    return this.actualizarTicket(id, ticket => ({
      ...ticket,
      tecnicoAsignado: payload.tecnico,
      ultimoMovimiento: new Date().toISOString()
    }));
  }

  registrarReparacion(id: number, payload: RegistrarReparacionPayload): Observable<TicketMantenimiento> {
    return this.actualizarTicket(id, ticket => ({
      ...ticket,
      diagnostico: payload.diagnostico ?? ticket.diagnostico,
      accionesRealizadas: payload.accionesRealizadas ?? ticket.accionesRealizadas,
      piezasUtilizadas: payload.piezasUtilizadas ?? ticket.piezasUtilizadas,
      tiempoEnColaHoras: payload.tiempoEmpleadoHoras ?? ticket.tiempoEnColaHoras,
      ultimoMovimiento: new Date().toISOString()
    }));
  }

  private actualizarTicket(
    id: number,
    updater: (ticket: TicketMantenimiento) => TicketMantenimiento
  ): Observable<TicketMantenimiento> {
    return this.obtenerTicketPorId(id).pipe(
      switchMap(ticket => {
        const actualizado = updater(ticket);
        return this.http.put<TicketMantenimiento>(`${this.baseUrl}/Reparaciones/${id}`, actualizado);
      })
    );
  }
}
