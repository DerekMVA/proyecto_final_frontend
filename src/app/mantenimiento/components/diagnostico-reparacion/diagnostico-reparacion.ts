import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, finalize } from 'rxjs';
import { TicketMantenimiento } from '../../../core/models/mantenimiento';
import { MantenimientoService } from '../../../core/services/mantenimiento.service';
import { NotificacionesService } from '../../../core/services/notificaciones.service';

@Component({
  selector: 'app-diagnostico-reparacion',
  imports: [CommonModule, RouterLink],
  templateUrl: './diagnostico-reparacion.html',
  styleUrl: './diagnostico-reparacion.css'
})
export class DiagnosticoReparacion {
  private readonly mantenimientoService = inject(MantenimientoService);
  private readonly notificaciones = inject(NotificacionesService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly ticketIdActual = signal<number | null>(null);
  readonly ticket = signal<TicketMantenimiento | null>(null);
  readonly loadingTicket = signal<boolean>(false);
  readonly ticketError = signal<string | null>(null);
  readonly guardando = signal<boolean>(false);
  readonly diagnosticoTecnico = signal<string>('');
  readonly accionesRealizadas = signal<string>('');
  readonly piezasTexto = signal<string>('');
  readonly tiempoHoras = signal<string>('');
  readonly costoEstimado = signal<string>('');
  readonly ultimaActualizacion = signal<Date | null>(null);

  readonly puedeGuardar = computed(() => {
    const ticket = this.ticket();
    const diagnostico = this.diagnosticoTecnico().trim();
    return !!ticket && !!diagnostico && !this.guardando();
  });

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      const idParam = params.get('ticket');
      if (!idParam) {
        this.ticket.set(null);
        this.ticketIdActual.set(null);
        this.limpiarFormulario();
        return;
      }
      const id = Number(idParam);
      if (!Number.isFinite(id)) {
        this.ticketError.set('El identificador del ticket no es válido.');
        return;
      }
      if (id === this.ticketIdActual()) {
        return;
      }
      this.cargarTicket(id);
    });
  }

  cargarDesdeInput(valor: string): void {
    const id = Number(valor);
    if (!Number.isFinite(id)) {
      this.notificaciones.info('Ingresa un ID numérico de ticket.');
      return;
    }
    this.cargarTicket(id);
  }

  actualizarDiagnostico(valor: string): void {
    this.diagnosticoTecnico.set(valor);
  }

  actualizarAcciones(valor: string): void {
    this.accionesRealizadas.set(valor);
  }

  actualizarPiezas(valor: string): void {
    this.piezasTexto.set(valor);
  }

  actualizarTiempo(valor: string): void {
    this.tiempoHoras.set(valor);
  }

  actualizarCosto(valor: string): void {
    this.costoEstimado.set(valor);
  }

  registrarReparacion(): void {
    const ticket = this.ticket();
    if (!ticket) {
      return;
    }
    const diagnostico = this.diagnosticoTecnico().trim();
    if (!diagnostico) {
      this.notificaciones.info('El diagnóstico técnico es obligatorio.');
      return;
    }

    const acciones = this.accionesRealizadas().trim() || null;
    const piezas = this.obtenerPiezasFormateadas();
    const tiempoEmpleado = this.convertirNumero(this.tiempoHoras());
    const costo = this.convertirNumero(this.costoEstimado());

    this.guardando.set(true);

    this.mantenimientoService
      .registrarReparacion(ticket.id, {
        diagnostico,
        accionesRealizadas: acciones,
        piezasUtilizadas: piezas.length ? piezas : undefined,
        tiempoEmpleadoHoras: tiempoEmpleado,
        costoEstimado: costo
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.guardando.set(false)),
        catchError(error => {
          console.error('No se pudo registrar la reparación', error);
          this.notificaciones.error('No se pudo registrar la reparación.');
          return EMPTY;
        })
      )
      .subscribe(actualizado => {
        this.ticket.set(actualizado);
        this.ticketIdActual.set(actualizado.id);
        this.ultimaActualizacion.set(new Date());
        this.hidratarFormulario(actualizado);
        this.notificaciones.exito('Reparación registrada correctamente.');
      });
  }

  private cargarTicket(id: number): void {
    this.ticketIdActual.set(id);
    this.loadingTicket.set(true);
    this.ticketError.set(null);

    this.mantenimientoService
      .obtenerTicketPorId(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingTicket.set(false)),
        catchError(error => {
          console.error('No se pudo cargar el ticket', error);
          this.ticketError.set('No se pudo cargar la información del ticket.');
          this.notificaciones.error('No se pudo obtener la información del ticket.');
          return EMPTY;
        })
      )
      .subscribe(ticket => {
        this.ticket.set(ticket);
        this.ultimaActualizacion.set(new Date());
        this.hidratarFormulario(ticket);
        this.notificaciones.info(`Ticket ${ticket.codigo} cargado.`);
      });
  }

  private hidratarFormulario(ticket: TicketMantenimiento): void {
    this.diagnosticoTecnico.set(ticket.diagnosticoTecnico ?? ticket.diagnostico ?? '');
    this.accionesRealizadas.set(ticket.accionesRealizadas ?? '');
    this.piezasTexto.set((ticket.piezasUtilizadas ?? []).join('\n'));
    this.tiempoHoras.set('');
    this.costoEstimado.set('');
  }

  private limpiarFormulario(): void {
    this.diagnosticoTecnico.set('');
    this.accionesRealizadas.set('');
    this.piezasTexto.set('');
    this.tiempoHoras.set('');
    this.costoEstimado.set('');
  }

  private obtenerPiezasFormateadas(): string[] {
    return this.piezasTexto()
      .split(/\r?\n|,/)
      .map(pieza => pieza.trim())
      .filter(Boolean);
  }

  private convertirNumero(valor: string): number | null {
    const numero = Number(valor);
    if (!Number.isFinite(numero) || numero < 0) {
      return null;
    }
    return numero;
  }

}
