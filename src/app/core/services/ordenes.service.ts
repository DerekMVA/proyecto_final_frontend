import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CrearOrdenPayload, EstadoOrden, OrdenTrabajo, PrioridadOrden } from '../models/orden';
import { EstadoEnsamble, OrdenEnsamble, PrioridadEnsamble } from '../models/ensamble';
import { PrioridadMantenimiento, TicketMantenimiento } from '../models/mantenimiento';

@Injectable({ providedIn: 'root' })
export class OrdenesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  obtenerOrdenes(): Observable<OrdenTrabajo[]> {
    return forkJoin({
      ensambles: this.http.get<OrdenEnsamble[]>(`${this.baseUrl}/OrdenesEnsambles`),
      reparaciones: this.http.get<TicketMantenimiento[]>(`${this.baseUrl}/Reparaciones`)
    }).pipe(
      map(({ ensambles, reparaciones }) => [
        ...ensambles.map(orden => this.mapEnsambleOrden(orden)),
        ...reparaciones.map(ticket => this.mapReparacionOrden(ticket))
      ])
    );
  }

  crearOrden(payload: CrearOrdenPayload): Observable<OrdenTrabajo> {
    if (payload.tipo === 'Ensamble') {
      const nuevoEnsamble: OrdenEnsamble = {
        id: 0,
        codigo: this.generarCodigo('ENS'),
        descripcion: payload.descripcion,
        cliente: `Cliente #${payload.clienteId ?? 'N/A'}`,
        prioridad: payload.prioridad as PrioridadEnsamble,
        estado: 'Pendiente',
        tecnicoAsignado: null,
        progreso: 0,
        fechaSolicitud: new Date().toISOString(),
        componentes: [],
        notas: null
      };

      return this.http
        .post<OrdenEnsamble>(`${this.baseUrl}/OrdenesEnsambles`, nuevoEnsamble)
        .pipe(map(orden => this.mapEnsambleOrden(orden)));
    }

    const nuevaReparacion: TicketMantenimiento = {
      id: 0,
      codigo: this.generarCodigo('REP'),
      equipo: payload.descripcion,
      cliente: `Cliente #${payload.clienteId ?? 'N/A'}`,
      prioridad: payload.prioridad as PrioridadMantenimiento,
      estado: 'En diagnóstico',
      tipoServicio: payload.canal ?? 'General',
      diagnostico: null,
      diagnosticoTecnico: null,
      accionesRealizadas: null,
      piezasUtilizadas: [],
      tecnicoAsignado: null,
      ingreso: new Date().toISOString(),
      entregaEstimada: null,
      progreso: 0,
      tiempoEnColaHoras: 0,
      observaciones: payload.observaciones ?? null,
      ultimoMovimiento: new Date().toISOString()
    };

    return this.http
      .post<TicketMantenimiento>(`${this.baseUrl}/Reparaciones`, nuevaReparacion)
      .pipe(map(ticket => this.mapReparacionOrden(ticket)));
  }

  private mapEnsambleOrden(orden: OrdenEnsamble): OrdenTrabajo {
    return {
      id: orden.id,
      codigo: orden.codigo ?? this.generarCodigo('ENS'),
      tipo: 'Ensamble',
      clienteId: 0,
      clienteNombre: orden.cliente ?? 'Cliente sin nombre',
      descripcion: orden.descripcion ?? '',
      estado: this.mapEstadoEnsamble(orden.estado),
      prioridad: (orden.prioridad as PrioridadOrden) ?? 'Media',
      tecnicoAsignado: orden.tecnicoAsignado,
      canal: 'Producción',
      fechaCreacion: orden.fechaSolicitud,
      fechaActualizacion: orden.fechaEntregaEstimada
    };
  }

  private mapReparacionOrden(ticket: TicketMantenimiento): OrdenTrabajo {
    return {
      id: ticket.id,
      codigo: ticket.codigo ?? this.generarCodigo('REP'),
      tipo: 'Mantenimiento',
      clienteId: 0,
      clienteNombre: ticket.cliente ?? 'Cliente sin nombre',
      descripcion: ticket.diagnostico ?? ticket.equipo ?? '',
      estado: this.mapEstadoMantenimiento(ticket.estado),
      prioridad: (ticket.prioridad as PrioridadOrden) ?? 'Media',
      tecnicoAsignado: ticket.tecnicoAsignado,
      canal: ticket.tipoServicio ?? 'Taller',
      fechaCreacion: ticket.ingreso,
      fechaActualizacion: ticket.ultimoMovimiento
    };
  }

  private mapEstadoEnsamble(estado?: EstadoEnsamble | null): EstadoOrden {
    switch (estado) {
      case 'Pendiente':
        return 'Registrada';
      case 'En progreso':
      case 'En pruebas':
        return 'En progreso';
      case 'Completado':
      case 'Entregado':
        return 'Finalizada';
      default:
        return 'Registrada';
    }
  }

  private mapEstadoMantenimiento(estado?: string | null): EstadoOrden {
    switch (estado) {
      case 'En diagnóstico':
        return 'Registrada';
      case 'En reparación':
      case 'En pruebas':
        return 'En progreso';
      case 'Listo':
      case 'Entregado':
        return 'Finalizada';
      default:
        return 'Registrada';
    }
  }

  private generarCodigo(prefijo: string): string {
    return `${prefijo}-${Date.now()}`;
  }
}
