import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, finalize } from 'rxjs';
import { OrdenesService } from '../../../core/services/ordenes.service';
import { EstadoOrden, OrdenTrabajo, TipoOrden } from '../../../core/models/orden';
import { NotificacionesService } from '../../../core/services/notificaciones.service';

@Component({
  selector: 'app-lista-ordenes',
  imports: [CommonModule, RouterLink],
  template: `
<div class="p-6 lg:p-8 space-y-8">
  <div class="flex flex-wrap items-center justify-between gap-4">
    <div>
      <p class="text-sm font-semibold text-indigo-600 uppercase tracking-tight">Ordenes</p>
      <h1 class="text-3xl font-bold text-gray-900">Órdenes de trabajo</h1>
      <p class="text-sm text-gray-500">Monitorea cada orden y haz seguimiento del flujo entre ensamble y mantenimiento.</p>
    </div>
    <a routerLink="/ordenes/nueva" class="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700">
      + Crear orden
    </a>
  </div>

  <section class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
    <article class="stat-card">
      <p class="stat-label">Total de órdenes</p>
      <p class="stat-value">{{ resumen().total }}</p>
    </article>
    <article class="stat-card">
      <p class="stat-label">Registradas</p>
      <p class="stat-value">{{ resumen().registradas }}</p>
    </article>
    <article class="stat-card">
      <p class="stat-label">En progreso</p>
      <p class="stat-value">{{ resumen().enProgreso }}</p>
    </article>
    <article class="stat-card">
      <p class="stat-label">Finalizadas</p>
      <p class="stat-value">{{ resumen().finalizadas }}</p>
    </article>
  </section>

  <section class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
    <div class="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <label class="text-sm text-gray-600 space-y-1">
        Buscar
        <input type="search" class="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" placeholder="Código, cliente o técnico" [value]="busqueda()" (input)="actualizarBusqueda($any($event.target).value)">
      </label>
      <label class="text-sm text-gray-600 space-y-1">
        Tipo
        <select class="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" [value]="filtroTipo()" (change)="actualizarTipoFiltro($any($event.target).value)">
          <option value="todas">Todos</option>
          @for (tipo of tipos; track tipo) {
            <option [value]="tipo">{{ tipo }}</option>
          }
        </select>
      </label>
      <label class="text-sm text-gray-600 space-y-1">
        Estado
        <select class="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" [value]="filtroEstado()" (change)="actualizarEstadoFiltro($any($event.target).value)">
          <option value="todos">Todos</option>
          @for (estado of estados; track estado) {
            <option [value]="estado">{{ estado }}</option>
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
      <div class="p-4 bg-red-50 text-red-700 rounded-xl">{{ error() }}</div>
    }

    @if (!loading() && !error() && ordenesFiltradas().length === 0) {
      <div class="p-6 border border-dashed border-gray-200 rounded-2xl text-center text-gray-500">
        No se encontraron órdenes con los filtros aplicados.
      </div>
    }

    @if (!loading() && !error() && ordenesFiltradas().length > 0) {
      <div class="overflow-x-auto">
        <table class="tabla-ordenes">
          <thead>
            <tr>
              <th>Código</th>
              <th>Tipo</th>
              <th>Cliente</th>
              <th>Técnico</th>
              <th>Estado</th>
              <th>Última actualización</th>
            </tr>
          </thead>
          <tbody>
            @for (orden of ordenesFiltradas(); track trackByOrden($index, orden)) {
              <tr>
                <td>
                  <div class="font-semibold text-gray-900">{{ orden.codigo }}</div>
                  <p class="text-sm text-gray-500">{{ orden.prioridad }} prioridad</p>
                </td>
                <td>{{ orden.tipo }}</td>
                <td>{{ orden.clienteNombre }}</td>
                <td>{{ orden.tecnicoAsignado || 'Sin asignar' }}</td>
                <td><span class="chip" [ngClass]="claseEstado(orden.estado)">{{ orden.estado }}</span></td>
                <td>{{ formatearFecha(orden.fechaActualizacion || orden.fechaCreacion) }}</td>
              </tr>
            }
          </tbody>
        </table>
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

.tabla-ordenes {
	@apply min-w-full text-left;
}

.tabla-ordenes thead {
	@apply text-sm uppercase tracking-wide text-gray-500 border-b border-gray-100;
}

.tabla-ordenes th {
	@apply px-4 py-3 font-semibold;
}

.tabla-ordenes td {
	@apply px-4 py-4 text-sm text-gray-700 border-b border-gray-50;
}

.chip {
	@apply inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold;
}

.skeleton {
	@apply rounded-2xl bg-gray-100 animate-pulse;
}

  `],
})
export class ListaOrdenes {
  private readonly ordenesService = inject(OrdenesService);
  private readonly notificaciones = inject(NotificacionesService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal<boolean>(true);
  readonly error = signal<string | null>(null);
  readonly ordenes = signal<OrdenTrabajo[]>([]);
  readonly filtroTipo = signal<'todas' | TipoOrden>('todas');
  readonly filtroEstado = signal<'todos' | EstadoOrden>('todos');
  readonly busqueda = signal<string>('');
  readonly ultimaActualizacion = signal<Date | null>(null);

  readonly tipos: TipoOrden[] = ['Ensamble', 'Mantenimiento'];
  readonly estados: EstadoOrden[] = ['Borrador', 'Registrada', 'En progreso', 'Finalizada', 'Cancelada'];

  readonly ordenesFiltradas = computed(() => {
    const estado = this.filtroEstado();
    const tipo = this.filtroTipo();
    const termino = this.busqueda().trim().toLowerCase();

    return this.ordenes().filter(orden => {
      if (tipo !== 'todas' && orden.tipo !== tipo) {
        return false;
      }
      if (estado !== 'todos' && orden.estado !== estado) {
        return false;
      }
      if (!termino) {
        return true;
      }
      const texto = [orden.codigo, orden.clienteNombre, orden.tecnicoAsignado ?? '', orden.descripcion]
        .join(' ')
        .toLowerCase();
      return texto.includes(termino);
    });
  });

  readonly resumen = computed(() => {
    const ordenes = this.ordenes();
    const total = ordenes.length;
    const registradas = ordenes.filter(orden => orden.estado === 'Registrada').length;
    const enProgreso = ordenes.filter(orden => orden.estado === 'En progreso').length;
    const finalizadas = ordenes.filter(orden => orden.estado === 'Finalizada').length;
    return { total, registradas, enProgreso, finalizadas };
  });

  readonly trackByOrden = (_: number, orden: OrdenTrabajo): number => orden.id;

  constructor() {
    this.cargarOrdenes();
  }

  refrescar(): void {
    this.cargarOrdenes(true);
  }

  actualizarBusqueda(valor: string): void {
    this.busqueda.set(valor);
  }

  actualizarTipoFiltro(valor: string): void {
    if (valor === 'todas' || this.tipos.includes(valor as TipoOrden)) {
      this.filtroTipo.set(valor as 'todas' | TipoOrden);
    }
  }

  actualizarEstadoFiltro(valor: string): void {
    if (valor === 'todos' || this.estados.includes(valor as EstadoOrden)) {
      this.filtroEstado.set(valor as 'todos' | EstadoOrden);
    }
  }

  claseEstado(estado: EstadoOrden): string {
    switch (estado) {
      case 'Borrador':
        return 'bg-gray-100 text-gray-700';
      case 'Registrada':
        return 'bg-sky-50 text-sky-700';
      case 'En progreso':
        return 'bg-amber-50 text-amber-700';
      case 'Finalizada':
        return 'bg-emerald-50 text-emerald-700';
      case 'Cancelada':
        return 'bg-red-50 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  }

  formatearFecha(valor?: string | null): string {
    if (!valor) {
      return '—';
    }
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) {
      return '—';
    }
    return fecha.toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  private cargarOrdenes(esRefresco = false): void {
    this.loading.set(true);
    this.error.set(null);

    this.ordenesService
      .obtenerOrdenes()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
        catchError(error => {
          console.error('No se pudo cargar la lista de órdenes', error);
          this.error.set('No se pudo cargar la lista de órdenes.');
          this.notificaciones.error('No se pudo obtener las órdenes.');
          return EMPTY;
        })
      )
      .subscribe(ordenes => {
        this.ordenes.set(ordenes);
        this.ultimaActualizacion.set(new Date());
        this.notificaciones.info(esRefresco ? 'Órdenes actualizadas.' : 'Órdenes cargadas.');
      });
  }

}
