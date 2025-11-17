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
  templateUrl: './inventario-general.html',
  styleUrl: './inventario-general.css'
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
