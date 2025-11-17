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
  templateUrl: './cola-ensamble.html',
  styleUrl: './cola-ensamble.css'
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
