import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, finalize } from 'rxjs';
import { InventarioService } from '../../../core/services/inventario.service';
import { InventarioItem } from '../../../core/models/inventario';
import { NotificacionesService } from '../../../core/services/notificaciones.service';

@Component({
  selector: 'app-inventario-general',
  imports: [CommonModule, RouterLink],
  template: `
<div class="p-8 space-y-6">
  <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
    <div>
      <h1 class="text-3xl font-bold text-gray-800">Control de Inventario</h1>
      <p class="text-sm text-gray-500">Mostrando {{ totalFiltrados() }} de {{ articulos().length }} productos</p>
    </div>
    <div class="flex flex-wrap gap-3">
      <button type="button"
        class="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
        (click)="limpiarFiltros()" [disabled]="!hayFiltrosActivos()">
        Limpiar filtros
      </button>
      <button type="button"
        class="px-4 py-2 rounded-lg bg-gray-800 text-white font-semibold hover:bg-gray-900 disabled:opacity-50"
        (click)="refrescar()" [disabled]="loading()">
        {{ loading() ? 'Actualizando…' : 'Refrescar' }}
      </button>
      <a routerLink="/inventario/ajuste"
        class="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700">
        Registrar ajuste
      </a>
    </div>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
    <div class="bg-white border border-gray-100 rounded-lg p-4 shadow-sm">
      <p class="text-sm text-gray-500">Productos registrados</p>
      <p class="text-2xl font-semibold text-gray-900">{{ resumen().total }}</p>
    </div>
    <div class="bg-white border border-gray-100 rounded-lg p-4 shadow-sm">
      <p class="text-sm text-gray-500">Stock total</p>
      <p class="text-2xl font-semibold text-gray-900">{{ resumen().stockTotal }}</p>
    </div>
    <div class="bg-white border border-gray-100 rounded-lg p-4 shadow-sm">
      <p class="text-sm text-gray-500">Bajo stock</p>
      <p class="text-2xl font-semibold text-amber-600">{{ resumen().criticos }}</p>
    </div>
    <div class="bg-white border border-gray-100 rounded-lg p-4 shadow-sm">
      <p class="text-sm text-gray-500">Sin stock</p>
      <p class="text-2xl font-semibold text-red-600">{{ resumen().sinStock }}</p>
    </div>
  </div>

  <div class="bg-white rounded-lg shadow border border-gray-100">
    <div class="p-6 grid grid-cols-1 xl:grid-cols-4 gap-4">
      <label class="flex flex-col gap-1 text-sm text-gray-700">
        <span>Buscar</span>
        <input type="search"
          class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-gray-200"
          placeholder="Nombre, código o categoría" [value]="termino()"
          (input)="actualizarTermino($any($event.target).value)" />
        </label>

        <label class="flex flex-col gap-1 text-sm text-gray-700">
          <span>Categoría</span>
          <select class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-gray-200"
            [value]="categoria()" (change)="actualizarCategoria($any($event.target).value)">
            <option value="todas">Todas</option>
            @for (categoria of categorias(); track categoria) {
              <option [value]="categoria">{{ categoria }}</option>
            }
          </select>
        </label>

        <label class="flex flex-col gap-1 text-sm text-gray-700">
          <span>Estado</span>
          <select class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-gray-200"
            [value]="estado()" (change)="actualizarEstado($any($event.target).value)">
            <option value="todos">Todos</option>
            @for (estado of estados(); track estado) {
              <option [value]="estado">{{ estado }}</option>
            }
          </select>
        </label>

        <label class="flex flex-col gap-1 text-sm text-gray-700">
          <span>Ordenar por</span>
          <select class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-gray-200"
            [value]="orden()" (change)="actualizarOrden($any($event.target).value)">
            <option value="nombre-asc">Nombre (A-Z)</option>
            <option value="stock-desc">Stock (alto a bajo)</option>
            <option value="stock-asc">Stock (bajo a alto)</option>
            <option value="actualizado-desc">Actualizados recientemente</option>
          </select>
        </label>
      </div>

      @if (loading()) {
        <div class="px-6 py-8 text-center text-gray-500 border-t border-gray-100">
          Cargando inventario…
        </div>
      }

      @if (!loading() && error()) {
        <div class="px-6 py-8 text-center text-red-600 border-t border-gray-100">
          {{ error() }}
        </div>
      }

      @if (!loading() && !error()) {
        @if (totalFiltrados()) {
          <div class="overflow-x-auto border-t border-gray-100">
            <table class="min-w-full">
              <thead class="bg-gray-100">
                <tr>
                  <th class="p-4 text-left">Código</th>
                  <th class="p-4 text-left">Nombre</th>
                  <th class="p-4 text-left">Categoría</th>
                  <th class="p-4 text-center">Stock</th>
                  <th class="p-4 text-center">Estado</th>
                  <th class="p-4 text-right">Precio</th>
                  <th class="p-4 text-center">Actualizado</th>
                  <th class="p-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (articulo of articulosProcesados(); track trackByArticulo($index, articulo)) {
                  <tr
                    class="border-b last:border-b-0 hover:bg-gray-50">
                    <td class="p-4 text-sm text-gray-600">{{ articulo.codigo }}</td>
                    <td class="p-4 font-medium text-gray-900">
                      {{ articulo.nombre }}
                      @if (articulo.ubicacion) {
                        <span class="block text-xs text-gray-500">{{ articulo.ubicacion }}</span>
                      }
                    </td>
                    <td class="p-4 text-sm text-gray-600">{{ articulo.categoria }}</td>
                    <td class="p-4 text-center">
                      <span
                        class="inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-semibold"
                        [class.bg-green-100]="articulo.stockActual > (articulo.stockMinimo ?? 0)"
                        [class.text-green-800]="articulo.stockActual > (articulo.stockMinimo ?? 0)"
                        [class.bg-amber-100]="articulo.stockActual <= (articulo.stockMinimo ?? 0) && articulo.stockActual > 0"
                        [class.text-amber-800]="articulo.stockActual <= (articulo.stockMinimo ?? 0) && articulo.stockActual > 0"
                        [class.bg-red-100]="articulo.stockActual <= 0"
                        [class.text-red-800]="articulo.stockActual <= 0">
                        {{ articulo.stockActual }}
                      </span>
                    </td>
                    <td class="p-4 text-center">
                      <span class="px-2 py-1 rounded-full text-xs"
                        [class.bg-gray-200]="!articulo.estado"
                        [class.text-gray-700]="!articulo.estado"
                        [class.bg-blue-100]="articulo.estado"
                        [class.text-blue-800]="articulo.estado">
                        {{ articulo.estado || 'Sin estado' }}
                      </span>
                    </td>
                    <td class="p-4 text-right font-semibold text-gray-900">
                      {{ articulo.precioUnitario | currency:'CRC':'symbol-narrow':'1.2-2' }}
                    </td>
                    <td class="p-4 text-center text-sm text-gray-500">
                      {{ articulo.actualizado ? (articulo.actualizado | date:'dd/MM/yyyy HH:mm') : '—' }}
                    </td>
                    <td class="p-4 text-center">
                      <a [routerLink]="['/inventario/detalle', articulo.id]"
                        class="text-blue-600 hover:underline text-sm font-semibold">
                        Ver detalle
                      </a>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <div class="px-6 py-10 text-center text-gray-500">
            No se encontraron productos para los filtros seleccionados.
          </div>
        }
      }
    </div>

  </div>
  `,
  styles: [`

  `],
})
export class InventarioGeneral {
  private readonly inventarioService = inject(InventarioService);
  private readonly notificaciones = inject(NotificacionesService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal<boolean>(true);
  readonly error = signal<string | null>(null);
  readonly articulos = signal<InventarioItem[]>([]);
  readonly termino = signal<string>('');
  readonly categoria = signal<string>('todas');
  readonly estado = signal<string>('todos');
  readonly orden = signal<'nombre-asc' | 'stock-desc' | 'stock-asc' | 'actualizado-desc'>('nombre-asc');

  readonly categorias = computed(() => {
    const categorias = new Set(
      this.articulos()
        .map(articulo => articulo.categoria)
        .filter((categoria): categoria is string => Boolean(categoria))
    );
    return Array.from(categorias).sort((a, b) => a.localeCompare(b));
  });

  readonly estados = computed(() => {
    const estados = new Set(
      this.articulos()
        .map(articulo => articulo.estado?.trim())
        .filter((estado): estado is string => Boolean(estado))
    );
    return Array.from(estados).sort((a, b) => a.localeCompare(b));
  });

  readonly resumen = computed(() => {
    const articulos = this.articulos();
    const total = articulos.length;
    const stockTotal = articulos.reduce((acc, item) => acc + item.stockActual, 0);
    const criticos = articulos.filter(item =>
      item.stockMinimo !== undefined &&
      item.stockMinimo !== null &&
      item.stockActual <= item.stockMinimo
    ).length;
    const sinStock = articulos.filter(item => item.stockActual <= 0).length;
    return { total, stockTotal, criticos, sinStock };
  });

  readonly articulosProcesados = computed(() => {
    const termino = this.termino().trim().toLowerCase();
    const categoria = this.categoria();
    const estado = this.estado();
    const orden = this.orden();

    const filtrados = this.articulos().filter(articulo => {
      if (categoria !== 'todas' && articulo.categoria !== categoria) {
        return false;
      }
      if (estado !== 'todos' && articulo.estado !== estado) {
        return false;
      }
      if (termino) {
        const coincidencia =
          articulo.nombre?.toLowerCase().includes(termino) ||
          articulo.codigo?.toLowerCase().includes(termino) ||
          articulo.categoria?.toLowerCase().includes(termino);
        if (!coincidencia) {
          return false;
        }
      }
      return true;
    });

    return filtrados.sort((a, b) => this.compararArticulos(a, b, orden));
  });

  readonly totalFiltrados = computed(() => this.articulosProcesados().length);

  constructor() {
    this.cargarInventario();
  }

  refrescar(): void {
    this.cargarInventario(true);
  }

  actualizarTermino(valor: string): void {
    this.termino.set(valor);
  }

  actualizarCategoria(valor: string): void {
    this.categoria.set(valor);
  }

  actualizarEstado(valor: string): void {
    this.estado.set(valor);
  }

  actualizarOrden(valor: string): void {
    if (valor === 'nombre-asc' || valor === 'stock-asc' || valor === 'stock-desc' || valor === 'actualizado-desc') {
      this.orden.set(valor);
    }
  }

  limpiarFiltros(): void {
    this.termino.set('');
    this.categoria.set('todas');
    this.estado.set('todos');
    this.orden.set('nombre-asc');
  }

  hayFiltrosActivos(): boolean {
    return (
      !!this.termino() ||
      this.categoria() !== 'todas' ||
      this.estado() !== 'todos' ||
      this.orden() !== 'nombre-asc'
    );
  }

  trackByArticulo = (_: number, articulo: InventarioItem): number => articulo.id;

  private cargarInventario(esRefresco = false): void {
    this.loading.set(true);
    this.error.set(null);

    this.inventarioService
      .obtenerInventario()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
        catchError(error => {
          console.error('No se pudo cargar el inventario', error);
          this.error.set('No se pudo obtener el inventario. Intenta nuevamente.');
          this.notificaciones.error('No se pudo cargar el inventario.');
          return EMPTY;
        })
      )
      .subscribe(articulos => {
        this.articulos.set(articulos);
        const mensaje = esRefresco ? 'Inventario actualizado.' : 'Inventario cargado.';
        this.notificaciones.info(mensaje);
      });
  }

  private compararArticulos(a: InventarioItem, b: InventarioItem, orden: 'nombre-asc' | 'stock-desc' | 'stock-asc' | 'actualizado-desc'): number {
    switch (orden) {
      case 'stock-desc':
        return b.stockActual - a.stockActual;
      case 'stock-asc':
        return a.stockActual - b.stockActual;
      case 'actualizado-desc':
        return this.obtenerTimestamp(b.actualizado) - this.obtenerTimestamp(a.actualizado);
      case 'nombre-asc':
      default:
        return a.nombre.localeCompare(b.nombre);
    }
  }

  private obtenerTimestamp(valor?: string | null): number {
    if (!valor) {
      return 0;
    }
    const fecha = new Date(valor);
    return Number.isNaN(fecha.getTime()) ? 0 : fecha.getTime();
  }
}
