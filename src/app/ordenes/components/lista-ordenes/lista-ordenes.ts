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
  templateUrl: './lista-ordenes.html',
  styleUrl: './lista-ordenes.css'
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
