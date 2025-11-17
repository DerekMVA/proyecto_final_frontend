import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, EMPTY, finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MantenimientoService } from '../../../core/services/mantenimiento.service';
import { EstadoMantenimiento, PrioridadMantenimiento, TicketMantenimiento } from '../../../core/models/mantenimiento';
import { NotificacionesService } from '../../../core/services/notificaciones.service';

@Component({
  selector: 'app-cola-mantenimiento',
  imports: [CommonModule, RouterLink],
  templateUrl: './cola-mantenimiento.html',
  styleUrl: './cola-mantenimiento.css'
})
export class ColaMantenimiento {
  private readonly mantenimientoService = inject(MantenimientoService);
  private readonly notificaciones = inject(NotificacionesService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = typeof window !== 'undefined';

  readonly loading = signal<boolean>(true);
  readonly error = signal<string | null>(null);
  readonly cola = signal<TicketMantenimiento[]>([]);
  readonly filtroEstado = signal<'todos' | EstadoMantenimiento>('todos');
  readonly filtroPrioridad = signal<'todas' | PrioridadMantenimiento>('todas');
  readonly busqueda = signal<string>('');
  readonly procesandoId = signal<number | null>(null);
  readonly asignandoId = signal<number | null>(null);
  readonly ultimaActualizacion = signal<Date | null>(null);

  readonly ticketsFiltrados = computed(() => {
    const estado = this.filtroEstado();
    const prioridad = this.filtroPrioridad();
    const termino = this.busqueda().trim().toLowerCase();

    return this.cola().filter(ticket => {
      if (estado !== 'todos' && ticket.estado !== estado) {
        return false;
      }
      if (prioridad !== 'todas' && ticket.prioridad !== prioridad) {
        return false;
      }
      if (!termino) {
        return true;
      }
      const texto = [ticket.codigo, ticket.equipo, ticket.cliente, ticket.tecnicoAsignado ?? '', ticket.tipoServicio ?? '']
        .join(' ')
        .toLowerCase();
      return texto.includes(termino);
    });
  });

  readonly estadisticas = computed(() => {
    const tickets = this.cola();
    const total = tickets.length;
    const activos = tickets.filter(ticket => ticket.estado !== 'Entregado');
    const listos = tickets.filter(ticket => ticket.estado === 'Listo');
    const enTaller = tickets.filter(ticket => ticket.estado === 'En reparación');
    const prioridadAlta = tickets.filter(ticket => ticket.prioridad === 'Alta');
    const tiempoPromedio = this.calcularTiempoPromedio(tickets);
    return { total, activos: activos.length, listos: listos.length, enTaller: enTaller.length, prioridadAlta: prioridadAlta.length, tiempoPromedio };
  });

  readonly trackByTicket = (_: number, ticket: TicketMantenimiento): number => ticket.id;
  readonly estados: EstadoMantenimiento[] = ['En diagnóstico', 'En reparación', 'En pruebas', 'Listo', 'Entregado'];
  readonly prioridades: PrioridadMantenimiento[] = ['Alta', 'Media', 'Baja'];

  constructor() {
    this.cargarCola();
  }

  refrescar(): void {
    this.cargarCola(true);
  }

  actualizarBusqueda(valor: string): void {
    this.busqueda.set(valor);
  }

  actualizarEstadoFiltro(valor: string): void {
    if (valor === 'todos' || this.estados.includes(valor as EstadoMantenimiento)) {
      this.filtroEstado.set(valor as 'todos' | EstadoMantenimiento);
    }
  }

  actualizarPrioridadFiltro(valor: string): void {
    if (valor === 'todas' || this.prioridades.includes(valor as PrioridadMantenimiento)) {
      this.filtroPrioridad.set(valor as 'todas' | PrioridadMantenimiento);
    }
  }

  cambiarEstadoDesdeSelect(ticket: TicketMantenimiento, valor: string): void {
    if (this.estados.includes(valor as EstadoMantenimiento)) {
      this.actualizarEstadoTicket(ticket, valor as EstadoMantenimiento);
    }
  }

  actualizarEstadoTicket(ticket: TicketMantenimiento, estado: EstadoMantenimiento): void {
    if (ticket.estado === estado) {
      return;
    }
    this.procesandoId.set(ticket.id);
    this.mantenimientoService
      .actualizarEstadoTicket(ticket.id, { estado })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.procesandoId.set(null)),
        catchError(error => {
          console.error('No se pudo actualizar el estado del ticket', error);
          this.notificaciones.error('No se pudo actualizar el estado del ticket.');
          return EMPTY;
        })
      )
      .subscribe(actualizado => {
        this.cola.update(actual => actual.map(item => (item.id === ticket.id ? actualizado : item)));
        this.notificaciones.exito(`Ticket ${actualizado.codigo} actualizado a ${estado}.`);
      });
  }

  asignarTecnico(ticket: TicketMantenimiento): void {
    if (!this.isBrowser) {
      return;
    }
    const tecnico = window.prompt('Ingresa el nombre del técnico asignado', ticket.tecnicoAsignado ?? '');
    if (!tecnico) {
      return;
    }
    this.asignandoId.set(ticket.id);
    this.mantenimientoService
      .asignarTecnico(ticket.id, { tecnico: tecnico.trim() })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.asignandoId.set(null)),
        catchError(error => {
          console.error('No se pudo asignar el técnico', error);
          this.notificaciones.error('No se pudo asignar el técnico.');
          return EMPTY;
        })
      )
      .subscribe(actualizado => {
        this.cola.update(actual => actual.map(item => (item.id === ticket.id ? actualizado : item)));
        this.notificaciones.info(`Ticket ${actualizado.codigo} asignado a ${actualizado.tecnicoAsignado}.`);
      });
  }

  claseEstado(estado: EstadoMantenimiento): string {
    switch (estado) {
      case 'En diagnóstico':
        return 'bg-amber-50 text-amber-800';
      case 'En reparación':
        return 'bg-blue-50 text-blue-800';
      case 'En pruebas':
        return 'bg-purple-50 text-purple-800';
      case 'Listo':
        return 'bg-emerald-50 text-emerald-800';
      case 'Entregado':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  }

  clasePrioridad(prioridad: PrioridadMantenimiento): string {
    switch (prioridad) {
      case 'Alta':
        return 'text-red-600 bg-red-50';
      case 'Media':
        return 'text-amber-600 bg-amber-50';
      case 'Baja':
        return 'text-emerald-600 bg-emerald-50';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  }

  formatearFecha(valor?: string | null): string {
    if (!valor) {
      return 'Sin registro';
    }
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) {
      return 'Sin registro';
    }
    return fecha.toLocaleString('es-CR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private cargarCola(esRefresco = false): void {
    this.loading.set(true);
    this.error.set(null);

    this.mantenimientoService
      .obtenerColaMantenimiento()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
        catchError(error => {
          console.error('No se pudo cargar la cola de mantenimiento', error);
          this.error.set('No se pudo cargar la cola de mantenimiento.');
          this.notificaciones.error('No se pudo obtener la cola de mantenimiento.');
          return EMPTY;
        })
      )
      .subscribe(tickets => {
        this.cola.set(tickets);
        this.ultimaActualizacion.set(new Date());
        const mensaje = esRefresco ? 'Cola actualizada.' : 'Cola de mantenimiento cargada.';
        this.notificaciones.info(mensaje);
      });
  }

  private calcularTiempoPromedio(tickets: TicketMantenimiento[]): number {
    if (!tickets.length) {
      return 0;
    }
    const total = tickets.reduce((acc, ticket) => acc + (ticket.tiempoEnColaHoras ?? 0), 0);
    return Math.round((total / tickets.length) * 10) / 10;
  }

}
