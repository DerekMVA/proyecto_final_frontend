import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, finalize } from 'rxjs';
import { InventarioService } from '../../../core/services/inventario.service';
import { InventarioItem } from '../../../core/models/inventario';
import { NotificacionesService } from '../../../core/services/notificaciones.service';

@Component({
  selector: 'app-producto-detalle',
  imports: [CommonModule, RouterLink],
  template: `
<div class="p-8 space-y-6">
  <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
    <div>
      <button type="button"
        class="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
        (click)="irAListado()">
        <span aria-hidden="true">←</span>
        Volver al inventario
      </button>
      <h1 class="text-3xl font-bold text-gray-800 mt-2">Detalle del Producto</h1>
    </div>
    <div class="flex flex-wrap gap-3">
      <button type="button"
        class="px-4 py-2 rounded-md border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
        (click)="refrescar()"
        [disabled]="loading()">
        {{ loading() ? 'Actualizando…' : 'Recargar' }}
      </button>
      <a routerLink="/inventario/ajuste"
        class="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">
        Registrar ajuste
      </a>
    </div>
  </div>

  @if (loading()) {
    <div class="bg-white p-6 rounded-lg shadow animate-pulse">
      <div class="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
      <div class="space-y-3">
        <div class="h-4 bg-slate-200 rounded"></div>
        <div class="h-4 bg-slate-200 rounded w-2/3"></div>
        <div class="h-4 bg-slate-200 rounded"></div>
      </div>
    </div>
  }

  @if (!loading()) {
    @if (error()) {
      <div class="bg-red-50 border border-red-200 text-red-800 p-6 rounded-lg">
        <p class="font-semibold mb-4">{{ error() }}</p>
        <button type="button"
          class="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-semibold hover:bg-red-700"
          (click)="refrescar()">
          Reintentar
        </button>
      </div>
    } @else {
      @if (producto(); as producto) {
        <div class="bg-white p-6 rounded-lg shadow space-y-6">
          <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p class="text-sm text-gray-500">Código {{ producto.codigo }}</p>
              <h2 class="text-2xl font-semibold text-gray-900">{{ producto.nombre }}</h2>
              <p class="text-sm text-gray-500">Actualizado {{ formatearFecha(producto.actualizado) }}</p>
            </div>
            <span class="px-3 py-1 text-sm font-semibold rounded-full"
              [ngClass]="stockEstado().clase">
              {{ stockEstado().etiqueta }}
            </span>
          </div>
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <section class="space-y-3">
              <h3 class="font-semibold text-gray-700">Inventario</h3>
              <div class="rounded-lg border border-gray-100 p-4 space-y-2 bg-gray-50">
                <div class="flex items-center justify-between">
                  <span class="text-gray-500">Stock actual</span>
                  <span class="text-lg font-semibold text-gray-900">{{ producto.stockActual }} uds</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-gray-500">Stock mínimo</span>
                  <span class="font-semibold text-gray-900">{{ producto.stockMinimo ?? '—' }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-gray-500">Stock máximo</span>
                  <span class="font-semibold text-gray-900">{{ producto.stockMaximo ?? '—' }}</span>
                </div>
              </div>
            </section>
            <section class="space-y-3">
              <h3 class="font-semibold text-gray-700">Clasificación</h3>
              <div class="rounded-lg border border-gray-100 p-4 space-y-2 bg-gray-50">
                <div class="flex items-center justify-between">
                  <span class="text-gray-500">Categoría</span>
                  <span class="font-semibold text-gray-900">{{ producto.categoria || 'Sin asignar' }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-gray-500">Estado</span>
                  <span class="font-semibold text-gray-900">{{ producto.estado || 'Sin estado' }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-gray-500">Ubicación</span>
                  <span class="font-semibold text-gray-900">{{ producto.ubicacion || 'Sin ubicación' }}</span>
                </div>
              </div>
            </section>
            <section class="space-y-3">
              <h3 class="font-semibold text-gray-700">Precios</h3>
              <div class="rounded-lg border border-gray-100 p-4 space-y-2 bg-gray-50">
                <div class="flex items-center justify-between">
                  <span class="text-gray-500">Precio unitario</span>
                  <span class="text-lg font-semibold text-gray-900">{{ producto.precioUnitario | currency:'CRC':'symbol' }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-gray-500">Valor total</span>
                  <span class="text-lg font-semibold text-gray-900">
                    {{ (producto.precioUnitario * producto.stockActual) | currency:'CRC':'symbol' }}
                  </span>
                </div>
              </div>
            </section>
          </div>
        </div>
      } @else {
        <div class="bg-yellow-50 border border-yellow-200 text-yellow-800 p-6 rounded-lg">
          <p class="font-semibold">No se encontró el producto solicitado.</p>
          <p class="text-sm">Es posible que haya sido eliminado o que el identificador sea incorrecto.</p>
        </div>
      }
    }
  }
</div>
  `,
  styles: [`

  `],
})
export class ProductoDetalle {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly inventarioService = inject(InventarioService);
  private readonly notificaciones = inject(NotificacionesService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal<boolean>(true);
  readonly error = signal<string | null>(null);
  readonly producto = signal<InventarioItem | null>(null);
  readonly productoId = signal<number | null>(null);

  readonly stockEstado = computed(() => {
    const item = this.producto();
    if (!item) {
      return { etiqueta: 'Sin datos', clase: 'bg-gray-100 text-gray-700' };
    }
    if (item.stockActual <= 0) {
      return { etiqueta: 'Sin stock', clase: 'bg-red-100 text-red-800' };
    }
    if (item.stockMinimo != null && item.stockActual <= item.stockMinimo) {
      return { etiqueta: 'Crítico', clase: 'bg-amber-100 text-amber-800' };
    }
    return { etiqueta: 'Saludable', clase: 'bg-green-100 text-green-800' };
  });

  constructor() {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(paramMap => {
        const idParam = paramMap.get('id');
        const id = idParam ? Number(idParam) : NaN;
        if (Number.isNaN(id)) {
          this.establecerError('No se encontró el producto solicitado.');
          return;
        }
        this.productoId.set(id);
        this.cargarDetalle(id);
      });
  }

  refrescar(): void {
    const id = this.productoId();
    if (id == null) {
      return;
    }
    this.cargarDetalle(id, true);
  }

  irAListado(): void {
    this.router.navigate(['/inventario']);
  }

  private cargarDetalle(id: number, esRefresco = false): void {
    this.loading.set(true);
    this.error.set(null);

    this.inventarioService
      .obtenerProductoPorId(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
        catchError(error => {
          console.error('No se pudo cargar el producto', error);
          this.establecerError('No se pudo cargar el detalle. Intenta de nuevo.');
          this.notificaciones.error('No se pudo cargar el detalle del producto.');
          return EMPTY;
        })
      )
      .subscribe(producto => {
        this.producto.set(producto);
        const mensaje = esRefresco ? 'Detalle actualizado.' : 'Producto cargado.';
        this.notificaciones.info(mensaje);
      });
  }

  private establecerError(mensaje: string): void {
    this.loading.set(false);
    this.producto.set(null);
    this.error.set(mensaje);
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
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

