import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, finalize } from 'rxjs';
import { EnsambleService } from '../../../core/services/ensamble.service';
import { ComponenteOrden, OrdenEnsamble, RegistrarAvanceEnsamblePayload } from '../../../core/models/ensamble';
import { NotificacionesService } from '../../../core/services/notificaciones.service';

@Component({
  selector: 'app-proceso-ensamble',
  imports: [CommonModule, RouterLink],
  template: `
<div class="p-6 lg:p-8 space-y-6">
  <div class="flex flex-wrap items-center justify-between gap-4">
    <div>
      <p class="text-sm font-semibold text-blue-600 uppercase tracking-tight">Proceso de ensamble</p>
      <h1 class="text-3xl font-bold text-gray-900">Control de orden de ensamble</h1>
      <p class="text-sm text-gray-500">Marca componentes instalados y registra el avance del equipo.</p>
    </div>
    <a routerLink="/ensamble" class="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 font-medium hover:border-gray-300">
      Volver a la cola
    </a>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
    <label class="text-sm text-gray-600 space-y-1 col-span-2">
      Buscar orden por ID
      <input type="number" placeholder="Ej: 1201" class="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-100" (keyup.enter)="cargarDesdeInput($any($event.target).value)">
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
    </div>
  }

  @if (!loading() && error()) {
    <div class="p-4 bg-red-50 text-red-700 rounded-xl">
      {{ error() }}
    </div>
  }

  @if (!loading() && !error() && !orden()) {
    <div class="p-6 border border-dashed border-gray-200 rounded-2xl text-center text-gray-500">
      Selecciona una orden desde la cola o ingresa el identificador para comenzar.
    </div>
  }

  @if (!loading() && !error() && orden(); as ordenActual) {
    <section class="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <article class="xl:col-span-2 orden-panel">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="text-sm text-gray-500">{{ ordenActual.codigo }}</p>
            <h2 class="text-2xl font-semibold text-gray-900">{{ ordenActual.descripcion }}</h2>
            <p class="text-sm text-gray-500">Cliente: {{ ordenActual.cliente }}</p>
          </div>
          <div class="text-right">
            <p class="text-sm text-gray-500">Estado</p>
            <p class="text-lg font-semibold">{{ ordenActual.estado }}</p>
            <p class="text-xs text-gray-500">Técnico: {{ ordenActual.tecnicoAsignado || 'Sin asignar' }}</p>
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mt-6">
          <div>
            <p class="text-gray-500">Componentes instalados</p>
            <p class="font-semibold text-gray-900">{{ componentesInstalados() }}/{{ componentes().length }}</p>
          </div>
          <div>
            <p class="text-gray-500">Entrega estimada</p>
            <p class="font-semibold text-gray-900">{{ ordenActual.fechaEntregaEstimada ? (ordenActual.fechaEntregaEstimada | date:'medium') : '—' }}</p>
          </div>
          <div>
            <p class="text-gray-500">Progreso</p>
            <p class="font-semibold text-gray-900">{{ progresoCalculado() }}%</p>
          </div>
        </div>
        <div class="flex items-center gap-3 text-sm mt-4">
          <div class="flex-1 h-2 rounded-full bg-gray-100">
            <div class="h-2 rounded-full bg-blue-600" [style.width.%]="progresoCalculado()"></div>
          </div>
          <span class="text-gray-600 font-medium">{{ progresoCalculado() }}%</span>
        </div>
        <div class="mt-8 space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900">Componentes</h3>
            <span class="text-sm text-gray-500">Pendientes: {{ componentesPendientes().length }}</span>
          </div>
          <ul class="space-y-3">
            @for (componente of componentes(); track trackByComponente($index, componente)) {
              <li class="componente-item">
                <div>
                  <p class="font-semibold text-gray-900">{{ componente.nombre }}</p>
                  <p class="text-xs text-gray-500">{{ componente.codigoInventario || 'Sin código' }}</p>
                </div>
                <label class="inline-flex items-center gap-2 text-sm text-gray-600">
                  <input type="checkbox" class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" [checked]="componente.instalado" (change)="alternarComponente(componente.id)">
                  Instalado
                </label>
              </li>
            }
          </ul>
        </div>
      </article>
      <article class="xl:col-span-1 orden-panel space-y-4">
        <div>
          <label class="text-sm text-gray-600">Notas de ensamble</label>
          <textarea rows="4" class="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-100" [value]="notas()" (input)="actualizarNotas($any($event.target).value)"></textarea>
        </div>
        <div>
          <label class="text-sm text-gray-600">Pruebas realizadas</label>
          <textarea rows="3" class="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-100" [value]="pruebas()" (input)="actualizarPruebas($any($event.target).value)"></textarea>
        </div>
        <div>
          <label class="text-sm text-gray-600">Tiempo invertido (horas)</label>
          <input type="number" min="0" step="0.5" class="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-100" [value]="tiempoHoras()" (input)="actualizarTiempo($any($event.target).value)">
        </div>
        <div class="space-y-2">
          <button type="button" class="w-full rounded-xl bg-blue-600 text-white font-semibold px-4 py-2.5 hover:bg-blue-700 disabled:opacity-50" [disabled]="!puedeRegistrar()" (click)="registrarAvance()">
            {{ guardando() ? 'Guardando...' : 'Registrar avance' }}
          </button>
          <button type="button" class="w-full rounded-xl bg-emerald-600 text-white font-semibold px-4 py-2.5 hover:bg-emerald-700 disabled:opacity-50" [disabled]="!puedeRegistrar()" (click)="registrarAvance(true)">
            Completar ensamble
          </button>
        </div>
      </article>
    </section>
  }
</div>
  `,
  styles: [`
.orden-panel {
	@apply rounded-2xl border border-gray-100 bg-white p-5 shadow-sm;
}

.skeleton {
	@apply rounded-2xl bg-gray-100 animate-pulse;
}

.componente-item {
	@apply flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3;
}

  `],
})
export class ProcesoEnsamble {
  private readonly ensambleService = inject(EnsambleService);
  private readonly notificaciones = inject(NotificacionesService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly ordenIdActual = signal<number | null>(null);
  readonly orden = signal<OrdenEnsamble | null>(null);
  readonly componentes = signal<ComponenteOrden[]>([]);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly guardando = signal<boolean>(false);
  readonly notas = signal<string>('');
  readonly pruebas = signal<string>('');
  readonly tiempoHoras = signal<string>('');
  readonly ultimaActualizacion = signal<Date | null>(null);

  readonly progresoCalculado = computed(() => {
    const lista = this.componentes();
    if (!lista.length) {
      return this.orden()?.progreso ?? 0;
    }
    const completados = lista.filter(componente => componente.instalado).length;
    return Math.round((completados / lista.length) * 100);
  });

  readonly componentesPendientes = computed(() => {
    return this.componentes().filter(componente => !componente.instalado);
  });

  readonly trackByComponente = (_: number, componente: ComponenteOrden): number => componente.id;

  componentesInstalados(): number {
    return this.componentes().filter(componente => componente.instalado).length;
  }

  readonly puedeRegistrar = computed(() => {
    return !!this.orden() && !this.guardando();
  });

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      const idParam = params.get('orden');
      if (!idParam) {
        this.orden.set(null);
        this.ordenIdActual.set(null);
        this.componentes.set([]);
        this.limpiarFormulario();
        return;
      }
      const id = Number(idParam);
      if (!Number.isFinite(id)) {
        this.error.set('El identificador de la orden no es válido.');
        return;
      }
      if (id === this.ordenIdActual()) {
        return;
      }
      this.cargarOrden(id);
    });
  }

  cargarDesdeInput(valor: string): void {
    const id = Number(valor);
    if (!Number.isFinite(id)) {
      this.notificaciones.info('Ingresa un ID numérico de orden.');
      return;
    }
    this.cargarOrden(id);
  }

  alternarComponente(id: number): void {
    this.componentes.update(lista => lista.map(componente => (componente.id === id ? { ...componente, instalado: !componente.instalado } : componente)));
  }

  actualizarNotas(valor: string): void {
    this.notas.set(valor);
  }

  actualizarPruebas(valor: string): void {
    this.pruebas.set(valor);
  }

  actualizarTiempo(valor: string): void {
    this.tiempoHoras.set(valor);
  }

  registrarAvance(completar = false): void {
    const orden = this.orden();
    if (!orden) {
      return;
    }
    const componentesCompletados = this.componentes()
      .filter(componente => componente.instalado)
      .map(componente => componente.id);

    const payload: RegistrarAvanceEnsamblePayload = {
      componentesCompletados,
      notas: this.notas().trim() || null,
      pruebasRealizadas: this.pruebas().trim() || null,
      tiempoEmpleadoHoras: this.convertirNumero(this.tiempoHoras()),
      estadoObjetivo: completar ? 'Completado' : undefined
    };

    this.guardando.set(true);
    this.ensambleService
      .registrarAvance(orden.id, payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.guardando.set(false)),
        catchError(error => {
          console.error('No se pudo registrar el avance de ensamble', error);
          this.notificaciones.error('No se pudo registrar el avance.');
          return EMPTY;
        })
      )
      .subscribe(actualizada => {
        this.orden.set(actualizada);
        this.ordenIdActual.set(actualizada.id);
        this.componentes.set(actualizada.componentes);
        this.ultimaActualizacion.set(new Date());
        this.notificaciones.exito(completar ? 'Orden completada correctamente.' : 'Avance registrado.');
      });
  }

  private cargarOrden(id: number): void {
    this.ordenIdActual.set(id);
    this.loading.set(true);
    this.error.set(null);

    this.ensambleService
      .obtenerOrdenPorId(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
        catchError(error => {
          console.error('No se pudo cargar la orden de ensamble', error);
          this.error.set('No se pudo cargar la orden seleccionada.');
          this.notificaciones.error('No se pudo obtener la orden.');
          return EMPTY;
        })
      )
      .subscribe(orden => {
        this.orden.set(orden);
        this.componentes.set(orden.componentes);
        this.notas.set(orden.notas ?? '');
        this.pruebas.set(orden.pruebasRealizadas ?? '');
        this.tiempoHoras.set('');
        this.ultimaActualizacion.set(new Date());
        this.notificaciones.info(`Orden ${orden.codigo} cargada.`);
      });
  }

  private limpiarFormulario(): void {
    this.notas.set('');
    this.pruebas.set('');
    this.tiempoHoras.set('');
  }

  private convertirNumero(valor: string): number | null {
    const numero = Number(valor);
    if (!Number.isFinite(numero) || numero < 0) {
      return null;
    }
    return numero;
  }

}
