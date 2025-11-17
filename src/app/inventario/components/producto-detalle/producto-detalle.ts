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
  templateUrl: './producto-detalle.html',
  styleUrl: './producto-detalle.css'
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

