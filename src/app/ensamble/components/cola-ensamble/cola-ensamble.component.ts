import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, finalize } from 'rxjs';
import { EnsambleService } from '../../../core/services/ensamble.service';
import { EstadoEnsamble, OrdenEnsamble } from '../../../core/models/ensamble';
import { NotificacionesService } from '../../../core/services/notificaciones.service';

@Component({
  selector: 'app-cola-ensamble',
  imports: [CommonModule, RouterLink],
  template: `
<div class="p-6 lg:p-8 space-y-8">
  <div class="flex flex-wrap items-center justify-between gap-4">
    <div>
      <p class="text-sm font-semibold text-purple-600 uppercase tracking-tight">Ensamble</p>
      <h1 class="text-3xl font-bold text-gray-900">Cola de órdenes de ensamble</h1>
      <p class="text-sm text-gray-500">Monitorea el estado de cada orden y avanza los equipos en producción.</p>
    </div>
    <div class="flex gap-3">
      <button type="button" class="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 font-medium hover:border-gray-300" (click)="refrescar()">
        Refrescar
      </button>
    </div>
  </div>

  <section class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
    <article class="stat-card">
      <p class="stat-label">Órdenes en cola</p>
      <p class="stat-value">{{ resumen().total }}</p>
    </article>
    <article class="stat-card">
      <p class="stat-label">Pendientes</p>
      <p class="stat-value">{{ resumen().pendientes }}</p>
    </article>
    <article class="stat-card">
      <p class="stat-label">En progreso</p>
      <p class="stat-value">{{ resumen().enProgreso }}</p>
    </article>
    <article class="stat-card">
      <p class="stat-label">Completados</p>
      <p class="stat-value">{{ resumen().completados }}</p>
    </article>
  </section>

  <section class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <label class="text-sm text-gray-600 space-y-1">
        Buscar
        <input type="search" class="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-100" placeholder="Código, cliente o técnico" [value]="busqueda()" (input)="actualizarBusqueda($any($event.target).value)">
      </label>
      <label class="text-sm text-gray-600 space-y-1">
        Estado
        <select class="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-100" [value]="filtroEstado()" (change)="actualizarEstadoFiltro($any($event.target).value)">
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
      <div class="p-4 bg-red-50 text-red-700 rounded-xl">
        {{ error() }}
      </div>
    }

    @if (!loading() && !error() && ordenesFiltradas().length === 0) {
      <div class="p-6 border border-dashed border-gray-200 rounded-2xl text-center text-gray-500">
        No se encontraron órdenes con los filtros aplicados.
      </div>
    }

    @if (!loading() && !error() && ordenesFiltradas().length > 0) {
      <div class="space-y-4">
        @for (orden of ordenesFiltradas(); track trackByOrden($index, orden)) {
          <article class="orden-card">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="text-sm text-gray-500">{{ orden.codigo }}</p>
                <h2 class="text-xl font-semibold text-gray-900">{{ orden.descripcion }}</h2>
                <p class="text-sm text-gray-500">Cliente: {{ orden.cliente }}</p>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <span class="chip" [ngClass]="orden.estado === 'Pendiente' ? 'bg-amber-50 text-amber-700' : orden.estado === 'En progreso' ? 'bg-blue-50 text-blue-700' : orden.estado === 'En pruebas' ? 'bg-purple-50 text-purple-700' : orden.estado === 'Completado' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-700'">{{ orden.estado }}</span>
                <span class="chip bg-slate-100 text-slate-700">Prioridad {{ orden.prioridad }}</span>
              </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
              <div>
                <p class="text-gray-500">Técnico</p>
                <p class="font-medium text-gray-900">{{ orden.tecnicoAsignado || 'Sin asignar' }}</p>
              </div>
              <div>
                <p class="text-gray-500">Entrega estimada</p>
                <p class="font-medium text-gray-900">{{ orden.fechaEntregaEstimada ? (orden.fechaEntregaEstimada | date:'mediumDate') : '—' }}</p>
              </div>
              <div>
                <p class="text-gray-500">Componentes</p>
                <p class="font-medium text-gray-900">{{ componentesCompletados(orden) }}/{{ orden.componentes.length }}</p>
              </div>
            </div>
            <div class="flex items-center gap-3 text-sm">
              <div class="flex-1 h-2 rounded-full bg-gray-100">
                <div class="h-2 rounded-full bg-purple-600" [style.width.%]="orden.progreso ?? 0"></div>
              </div>
              <span class="text-gray-600 font-medium">{{ orden.progreso ?? 0 }}%</span>
            </div>
            <div class="flex flex-wrap items-center justify-between gap-3">
              @if (orden.notas) {
                <div class="text-sm text-gray-500">{{ orden.notas }}</div>
              }
              <div class="flex flex-wrap items-center gap-2">
                <button type="button" class="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:border-gray-300" [disabled]="procesandoId() === orden.id" (click)="iniciarOrden(orden)">
                  {{ procesandoId() === orden.id ? 'Actualizando...' : 'Iniciar/Continuar' }}
                </button>
                <button type="button" class="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:border-gray-300" [disabled]="procesandoId() === orden.id" (click)="marcarListoPruebas(orden)">
                  Marcar en pruebas
                </button>
                <a class="px-4 py-2 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700" routerLink="/ensamble/proceso" [queryParams]="{ orden: orden.id }">
                  Abrir proceso
                </a>
              </div>
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

.orden-card {
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
export class ColaEnsamble {
  private readonly ensambleService = inject(EnsambleService);
  private readonly notificaciones = inject(NotificacionesService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal<boolean>(true);
  readonly error = signal<string | null>(null);
  readonly cola = signal<OrdenEnsamble[]>([]);
  readonly filtroEstado = signal<'todos' | EstadoEnsamble>('todos');
  readonly busqueda = signal<string>('');
  readonly procesandoId = signal<number | null>(null);
  readonly ultimaActualizacion = signal<Date | null>(null);

  readonly estados: EstadoEnsamble[] = ['Pendiente', 'En progreso', 'En pruebas', 'Completado', 'Entregado'];

  readonly ordenesFiltradas = computed(() => {
    const estado = this.filtroEstado();
    const termino = this.busqueda().trim().toLowerCase();
    return this.cola().filter(orden => {
      if (estado !== 'todos' && orden.estado !== estado) {
        return false;
      }
      if (!termino) {
        return true;
      }
      const texto = [orden.codigo, orden.descripcion, orden.cliente, orden.tecnicoAsignado ?? ''].join(' ').toLowerCase();
      return texto.includes(termino);
    });
  });

  readonly resumen = computed(() => {
    const ordenes = this.cola();
    const total = ordenes.length;
    const pendientes = ordenes.filter(orden => orden.estado === 'Pendiente').length;
    const enProgreso = ordenes.filter(orden => orden.estado === 'En progreso').length;
    const completados = ordenes.filter(orden => orden.estado === 'Completado').length;
    return { total, pendientes, enProgreso, completados };
  });

  readonly trackByOrden = (_: number, orden: OrdenEnsamble): number => orden.id;

  componentesCompletados(orden: OrdenEnsamble): number {
    return orden.componentes?.filter(componente => componente.instalado).length ?? 0;
  }

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
    if (valor === 'todos' || this.estados.includes(valor as EstadoEnsamble)) {
      this.filtroEstado.set(valor as 'todos' | EstadoEnsamble);
    }
  }

  iniciarOrden(orden: OrdenEnsamble): void {
    if (orden.estado === 'En progreso') {
      return;
    }
    this.actualizarEstado(orden, 'En progreso');
  }

  marcarListoPruebas(orden: OrdenEnsamble): void {
    if (orden.estado === 'En pruebas') {
      return;
    }
    this.actualizarEstado(orden, 'En pruebas');
  }

  private actualizarEstado(orden: OrdenEnsamble, estado: EstadoEnsamble): void {
    this.procesandoId.set(orden.id);
    this.ensambleService
      .actualizarEstado(orden.id, { estado })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.procesandoId.set(null)),
        catchError(error => {
          console.error('No se pudo actualizar el estado del ensamble', error);
          this.notificaciones.error('No se pudo actualizar el ensamble.');
          return EMPTY;
        })
      )
      .subscribe(actualizada => {
        this.cola.update(lista => lista.map(item => (item.id === orden.id ? actualizada : item)));
        this.notificaciones.info(`Orden ${actualizada.codigo} actualizada a ${estado}.`);
      });
  }

  private cargarCola(esRefresco = false): void {
    this.loading.set(true);
    this.error.set(null);
    this.ensambleService
      .obtenerCola()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
        catchError(error => {
          console.error('No se pudo obtener la cola de ensamble', error);
          this.error.set('No se pudo cargar la cola de ensamble.');
          this.notificaciones.error('No se pudo cargar la cola de ensamble.');
          return EMPTY;
        })
      )
      .subscribe(ordenes => {
        this.cola.set(ordenes);
        this.ultimaActualizacion.set(new Date());
        const mensaje = esRefresco ? 'Cola de ensamble actualizada.' : 'Cola de ensamble cargada.';
        this.notificaciones.info(mensaje);
      });
  }

}
