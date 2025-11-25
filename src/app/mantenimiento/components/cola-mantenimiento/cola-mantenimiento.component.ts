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
  template: `
<div class="p-6 lg:p-8 space-y-8">
  <div class="flex flex-wrap items-center justify-between gap-4">
    <div>
      <p class="text-sm font-semibold text-blue-600 uppercase tracking-tight">Mantenimiento</p>
      <h1 class="text-3xl font-bold text-gray-900">Cola de mantenimiento y garantías</h1>
      <p class="text-sm text-gray-500">Monitorea el estado de cada equipo y coordina al equipo técnico.</p>
    </div>
    <div class="flex gap-3">
      <button type="button" class="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 font-medium hover:border-gray-300" (click)="refrescar()">
        Refrescar
      </button>
      <a routerLink="/mantenimiento/diagnostico" class="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700">
        Ir a diagnósticos
      </a>
    </div>
  </div>

  <section class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
    <article class="stat-card">
      <p class="stat-label">Tickets en cola</p>
      <p class="stat-value">{{ estadisticas().total }}</p>
    </article>
    <article class="stat-card">
      <p class="stat-label">Activos en taller</p>
      <p class="stat-value">{{ estadisticas().activos }}</p>
    </article>
    <article class="stat-card">
      <p class="stat-label">Listos para entrega</p>
      <p class="stat-value">{{ estadisticas().listos }}</p>
    </article>
    <article class="stat-card">
      <p class="stat-label">Tiempo promedio (h)</p>
      <p class="stat-value">{{ estadisticas().tiempoPromedio }}</p>
    </article>
  </section>

  <section class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
    <div class="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <label class="text-sm text-gray-600 space-y-1">
        Buscar
        <input type="search" class="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Código, cliente o técnico" [value]="busqueda()" (input)="actualizarBusqueda($any($event.target).value)">
      </label>
      <label class="text-sm text-gray-600 space-y-1">
        Estado
        <select class="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-100" [value]="filtroEstado()" (change)="actualizarEstadoFiltro($any($event.target).value)">
          <option value="todos">Todos</option>
          @for (estado of estados; track estado) {
            <option [value]="estado">{{ estado }}</option>
          }
        </select>
      </label>
      <label class="text-sm text-gray-600 space-y-1">
        Prioridad
        <select class="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-100" [value]="filtroPrioridad()" (change)="actualizarPrioridadFiltro($any($event.target).value)">
          <option value="todas">Todas</option>
          @for (prioridad of prioridades; track prioridad) {
            <option [value]="prioridad">{{ prioridad }}</option>
          }
        </select>
      </label>
      <div class="text-sm text-gray-600 space-y-1">
        Última actualización
        <div class="h-10 flex items-center px-4 rounded-xl border border-gray-200 text-gray-700">
          {{ ultimaActualizacion() ? (ultimaActualizacion() | date:'short') : '—' }}
        </div>
      </div>
    </div>

    @if (loading()) {
      <div class="space-y-3">
        <div class="skeleton h-24"></div>
        <div class="skeleton h-24"></div>
        <div class="skeleton h-24"></div>
      </div>
    }

    @if (!loading() && error()) {
      <div class="p-4 bg-red-50 text-red-700 rounded-xl">
        {{ error() }}
      </div>
    }

    @if (!loading() && !error() && ticketsFiltrados().length === 0) {
      <div class="p-6 border border-dashed border-gray-200 rounded-2xl text-center text-gray-500">
        No se encontraron tickets con los filtros aplicados.
      </div>
    }

    @if (!loading() && !error() && ticketsFiltrados().length > 0) {
      <div class="space-y-4">
        @for (ticket of ticketsFiltrados(); track trackByTicket($index, ticket)) {
          <article class="ticket-card">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="text-sm text-gray-500">{{ ticket.codigo }}</p>
                <h2 class="text-xl font-semibold text-gray-900">{{ ticket.equipo }}</h2>
                <p class="text-sm text-gray-500">Cliente: {{ ticket.cliente }}</p>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <span class="chip" [ngClass]="clasePrioridad(ticket.prioridad)">{{ ticket.prioridad }}</span>
                <span class="chip" [ngClass]="claseEstado(ticket.estado)">{{ ticket.estado }}</span>
              </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
              <div>
                <p class="text-gray-500">Ingreso</p>
                <p class="font-medium text-gray-900">{{ formatearFecha(ticket.ingreso) }}</p>
              </div>
              <div>
                <p class="text-gray-500">Entrega estimada</p>
                <p class="font-medium text-gray-900">{{ formatearFecha(ticket.entregaEstimada) }}</p>
              </div>
              <div>
                <p class="text-gray-500">Tiempo en cola</p>
                <p class="font-medium text-gray-900">{{ ticket.tiempoEnColaHoras ?? 0 }} h</p>
              </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
              <div>
                <p class="text-gray-500">Técnico</p>
                <p class="font-medium text-gray-900">{{ ticket.tecnicoAsignado || 'Sin asignar' }}</p>
              </div>
              <div>
                <p class="text-gray-500">Tipo de servicio</p>
                <p class="font-medium text-gray-900">{{ ticket.tipoServicio || '—' }}</p>
              </div>
              <div>
                <p class="text-gray-500">Progreso</p>
                <div class="flex items-center gap-2">
                  <div class="h-2 flex-1 rounded-full bg-gray-100">
                    <div class="h-2 rounded-full bg-blue-600" [style.width.%]="ticket.progreso ?? 0"></div>
                  </div>
                  <span class="font-medium text-gray-900">{{ ticket.progreso ?? 0 }}%</span>
                </div>
              </div>
            </div>
            @if (ticket.diagnostico) {
              <p class="text-sm text-gray-500">{{ ticket.diagnostico }}</p>
            }
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="flex flex-wrap items-center gap-2">
                <button type="button" class="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:border-gray-300" [disabled]="asignandoId() === ticket.id" (click)="asignarTecnico(ticket)">
                  {{ asignandoId() === ticket.id ? 'Asignando...' : 'Asignar técnico' }}
                </button>
                <a class="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-semibold hover:bg-emerald-100" routerLink="/mantenimiento/diagnostico" [queryParams]="{ ticket: ticket.id }">
                  Diagnosticar
                </a>
              </div>
              <label class="text-sm text-gray-600 space-y-1">
                Actualizar estado
                <select class="w-64 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-100" [disabled]="procesandoId() === ticket.id" [value]="ticket.estado" (change)="cambiarEstadoDesdeSelect(ticket, $any($event.target).value)">
                  @for (estado of estados; track estado) {
                    <option [value]="estado">{{ estado }}</option>
                  }
                </select>
              </label>
            </div>
          </article>
        }
      </div>
    }
  </section>
</div>
  `,
  styles: [`
.stat-card {
	@apply rounded-2xl border border-gray-100 bg-white p-5 shadow-sm;
}

.stat-label {
	@apply text-sm text-gray-500;
}

.stat-value {
	@apply text-2xl font-semibold text-gray-900;
}

.ticket-card {
	@apply rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-4;
}

.chip {
	@apply inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold;
}

.skeleton {
	@apply rounded-2xl bg-gray-100 animate-pulse;
}

  `],
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
