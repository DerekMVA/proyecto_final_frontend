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
  templateUrl: './proceso-ensamble.html',
  styleUrl: './proceso-ensamble.css'
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
