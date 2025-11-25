import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, finalize } from 'rxjs';
import { ComprasService } from '../../../core/services/compras.service';
import { Compra, CompraDetalleLinea } from '../../../core/models/compra';
import { NotificacionesService } from '../../../core/services/notificaciones.service';
import { ProveedoresService } from '../../../core/services/proveedores.service';
import { Proveedor } from '../../../core/models/proveedor';

@Component({
  selector: 'app-detalle-compra',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
<div class="p-8">
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
    <h1 class="text-3xl font-bold text-gray-800">Detalle de Compra</h1>
    <a routerLink="/entradas" class="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900">
      <span aria-hidden="true">&#8592;</span>
      Volver al historial
    </a>
  </div>

  @if (loading()) {
    <div class="bg-white rounded-lg shadow p-6 text-center text-gray-500">
      Cargando detalle...
    </div>
  }

  @if (!loading() && error()) {
    <div class="bg-white rounded-lg shadow p-6 text-center text-red-600">
      {{ error() }}
    </div>
  }

  @if (!loading() && !error() && compra(); as compra) {
    <div class="bg-white shadow rounded-lg overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-100 bg-gray-50">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <h2 class="text-xl font-semibold text-gray-800">Compra {{ compra.codigo }}</h2>
            <p class="text-sm text-gray-500">Registrada el {{ compra.fecha | date:'dd/MM/yyyy' }}</p>
          </div>
          <span class="inline-flex items-center px-3 py-1 rounded-full border text-sm font-medium"
            [ngClass]="obtenerClaseEstado(compra.estado)">
            {{ compra.estado }}
          </span>
        </div>
      </div>
      <div class="px-6 py-4 grid gap-4 md:grid-cols-2">
        <div class="space-y-2">
          <span class="block text-sm font-semibold text-gray-500">Proveedor</span>
          <p class="text-lg text-gray-800">{{ compra.proveedor }}</p>
          @if (proveedorCargando()) {
            <div class="text-sm text-gray-500">Cargando datos del proveedor…</div>
          }
          @if (!proveedorCargando() && proveedorError()) {
            <div class="text-sm text-red-600">
              {{ proveedorError() }}
            </div>
          }
          @if (!proveedorCargando() && !proveedorError() && proveedor(); as proveedor) {
            <div class="text-sm text-gray-600 space-y-1">
              <p><span class="font-semibold text-gray-700">Contacto:</span> {{ proveedor.contacto || 'Sin definir' }}</p>
              <p><span class="font-semibold text-gray-700">Teléfono:</span> {{ proveedor.telefono || 'Sin definir' }}</p>
              <p><span class="font-semibold text-gray-700">Correo:</span> {{ proveedor.correo || 'Sin definir' }}</p>
              @if (proveedor.direccion) {
                <p><span class="font-semibold text-gray-700">Dirección:</span> {{ proveedor.direccion }}</p>
              }
            </div>
          }
        </div>
        <div class="space-y-2">
          <span class="block text-sm font-semibold text-gray-500">Monto total</span>
          <p class="text-lg font-semibold text-gray-900">{{ compra.montoTotal | currency:'CRC' }}</p>
          <div class="text-sm text-gray-600">
            <span class="font-semibold text-gray-700">Estado:</span> {{ compra.estado }}
          </div>
          <div class="text-sm text-gray-600">
            <span class="font-semibold text-gray-700">Fecha:</span> {{ compra.fecha | date:'dd/MM/yyyy HH:mm' }}
          </div>
        </div>
        @if (compra.observaciones) {
          <div class="md:col-span-2">
            <span class="block text-sm font-semibold text-gray-500">Observaciones</span>
            <p class="text-gray-700 whitespace-pre-line">{{ compra.observaciones }}</p>
          </div>
        }
      </div>
      <div class="border-t border-gray-100">
        @if (puedeCompletar() || puedeCancelar()) {
          <div class="px-6 py-4 bg-gray-50 border-b border-gray-100">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p class="text-sm font-semibold text-gray-700">Acciones rápidas</p>
                <p class="text-xs text-gray-500">Actualiza el estado de la compra según corresponda.</p>
              </div>
              <div class="flex flex-wrap gap-2">
                @if (puedeCompletar()) {
                  <button type="button"
                    class="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
                    (click)="cambiarEstado('Completada')" [disabled]="estadoActualizando()">
                    Marcar como completada
                  </button>
                }
                @if (puedeCancelar()) {
                  <button type="button"
                    class="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
                    (click)="cambiarEstado('Cancelada')" [disabled]="estadoActualizando()">
                    Cancelar compra
                  </button>
                }
              </div>
            </div>
            @if (estadoError()) {
              <div class="mt-3 text-sm text-red-600">
                {{ estadoError() }}
              </div>
            }
          </div>
        }
        @if (lineas().length) {
          <div class="px-6 py-4">
            <h3 class="text-lg font-semibold text-gray-800 mb-3">Detalle de productos</h3>
            <div class="overflow-x-auto">
              <table class="min-w-full">
                <thead class="bg-gray-100">
                  <tr>
                    <th class="p-3 text-left text-sm font-semibold text-gray-600">Producto</th>
                    <th class="p-3 text-right text-sm font-semibold text-gray-600">Cantidad</th>
                    <th class="p-3 text-right text-sm font-semibold text-gray-600">Precio unitario</th>
                    <th class="p-3 text-right text-sm font-semibold text-gray-600">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  @for (linea of lineas(); track linea) {
                    <tr class="border-b last:border-b-0 hover:bg-gray-50">
                      <td class="p-3 text-sm text-gray-700">{{ obtenerNombreProducto(linea) }}</td>
                      <td class="p-3 text-sm text-gray-700 text-right">{{ linea.cantidad }}</td>
                      <td class="p-3 text-sm text-gray-700 text-right">{{ linea.precioUnitario | currency:'CRC' }}</td>
                      <td class="p-3 text-sm text-gray-900 text-right font-semibold">{{ calcularSubtotal(linea) | currency:'CRC' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        } @else {
          <div class="px-6 py-4 text-sm text-gray-500">
            No se encontraron productos registrados para esta compra o la información no está disponible.
          </div>
        }
      </div>
    </div>
  }
</div>

  `,
  styles: [`

  `],
})
export class DetalleCompra {
  private readonly route = inject(ActivatedRoute);
  private readonly comprasService = inject(ComprasService);
  private readonly notificaciones = inject(NotificacionesService);
  private readonly proveedoresService = inject(ProveedoresService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal<boolean>(true);
  readonly error = signal<string | null>(null);
  readonly compra = signal<Compra | null>(null);
  readonly lineas = computed<CompraDetalleLinea[]>(() => this.compra()?.detalles ?? []);
  readonly proveedor = signal<Proveedor | null>(null);
  readonly proveedorCargando = signal<boolean>(false);
  readonly proveedorError = signal<string | null>(null);
  readonly estadoActualizando = signal<boolean>(false);
  readonly estadoError = signal<string | null>(null);
  readonly puedeCompletar = computed(() => this.compra()?.estado === 'Pendiente');
  readonly puedeCancelar = computed(() => {
    const estado = this.compra()?.estado;
    return estado === 'Pendiente' || estado === 'Completada';
  });

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      const idParam = params.get('id');
      if (!idParam) {
        this.loading.set(false);
        this.error.set('Identificador de compra no válido.');
        return;
      }
      const id = Number(idParam);
      if (!Number.isFinite(id)) {
        this.loading.set(false);
        this.error.set('El identificador de la compra no es numérico.');
        return;
      }
      this.cargarCompra(id);
    });
  }

  obtenerClaseEstado(estado: Compra['estado']): string {
    switch (estado) {
      case 'Pendiente':
        return 'bg-yellow-100 text-yellow-800 border-yellow-400';
      case 'Completada':
        return 'bg-green-100 text-green-800 border-green-400';
      case 'Cancelada':
        return 'bg-red-100 text-red-800 border-red-400';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  }

  calcularSubtotal(linea: CompraDetalleLinea): number {
    const subtotal = linea.total ?? linea.cantidad * linea.precioUnitario;
    return Number.isFinite(subtotal) ? subtotal : 0;
  }

  obtenerNombreProducto(linea: CompraDetalleLinea): string {
    return linea.producto ?? linea.descripcion ?? `Producto #${linea.id}`;
  }

  private cargarCompra(id: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.compra.set(null);

    this.comprasService
      .obtenerCompraPorId(id)
      .pipe(
      takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
        catchError(error => {
          console.error('No se pudo obtener el detalle de la compra', error);
          this.error.set('No se pudo obtener el detalle de la compra. Intenta nuevamente.');
          this.notificaciones.error('No se pudo cargar el detalle de la compra.');
          return EMPTY;
        })
      )
      .subscribe(compra => {
        if (!compra) {
          this.error.set('La compra solicitada no existe.');
          return;
        }
        this.compra.set(compra);
        this.notificaciones.info(`Detalle de la compra ${compra.codigo} cargado.`);
        this.cargarProveedor(compra.idProveedor);
      });
  }

  private cargarProveedor(idProveedor?: number): void {
    this.proveedor.set(null);
    this.proveedorError.set(null);

    if (!idProveedor) {
      return;
    }

    this.proveedorCargando.set(true);

    this.proveedoresService
      .obtenerProveedorPorId(idProveedor)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.proveedorCargando.set(false)),
        catchError(error => {
          console.error('No se pudo cargar el proveedor de la compra', error);
          this.proveedorError.set('No se pudo obtener la información del proveedor.');
          this.notificaciones.error('No se pudo cargar la información del proveedor.');
          return EMPTY;
        })
      )
      .subscribe(proveedor => {
        this.proveedor.set(proveedor);
      });
  }

  cambiarEstado(nuevoEstado: Compra['estado']): void {
    const compraActual = this.compra();
    if (!compraActual || compraActual.estado === nuevoEstado) {
      return;
    }

    this.estadoError.set(null);
    this.estadoActualizando.set(true);

    this.comprasService
      .actualizarEstadoCompra(compraActual.id, nuevoEstado)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.estadoActualizando.set(false)),
        catchError(error => {
          console.error('No se pudo actualizar el estado de la compra', error);
          this.estadoError.set('No se pudo actualizar el estado. Intenta nuevamente.');
          this.notificaciones.error('No se pudo actualizar el estado de la compra.');
          return EMPTY;
        })
      )
      .subscribe(compraActualizada => {
        this.compra.set(compraActualizada);
        if (compraActualizada.idProveedor !== compraActual.idProveedor) {
          this.cargarProveedor(compraActualizada.idProveedor);
        }
        this.notificaciones.exito(`Compra ${compraActualizada.codigo} actualizada a ${compraActualizada.estado}.`);
      });
  }
}
