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
  templateUrl: './detalle-compra.html',
  styleUrl: './detalle-compra.css'
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
