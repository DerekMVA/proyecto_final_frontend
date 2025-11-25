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
  template: `
<div class="p-6 lg:p-8 space-y-8">
  <div class="flex flex-wrap items-center justify-between gap-4">
    <div>
      <p class="text-sm font-semibold text-blue-600 uppercase tracking-tight">Mantenimiento</p>
      <h1 class="text-3xl font-bold text-gray-900">Diagnóstico y reparación</h1>
      <p class="text-sm text-gray-500">Ingresa el ID del ticket o abre este módulo desde la cola.</p>
    </div>
    <a routerLink="/mantenimiento" class="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 font-medium hover:border-gray-300">
      Volver a la cola
    </a>
  </div>

  <section class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <label class="text-sm text-gray-600 space-y-2">
        ID del ticket
        <div class="flex gap-3">
          <input #ticketInput type="number" class="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-100" [value]="ticketIdActual() ?? ''" (keyup.enter)="cargarDesdeInput(ticketInput.value)">
          <button type="button" class="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700" (click)="cargarDesdeInput(ticketInput.value)">
            Cargar
          </button>
        </div>
      </label>
      <div class="text-sm text-gray-600 space-y-2">
        Última actualización
        <div class="h-10 flex items-center px-4 rounded-xl border border-gray-200 text-gray-700">
          {{ ultimaActualizacion() ? (ultimaActualizacion() | date:'short') : '—' }}
        </div>
      </div>
      <div class="text-sm text-gray-600 space-y-2">
        Estado actual
        <div class="h-10 flex items-center px-4 rounded-xl" [ngClass]="ticket() ? 'bg-blue-50 text-blue-800 border border-blue-100' : 'border border-gray-200 text-gray-500'">
          {{ ticket()?.estado || 'Selecciona un ticket' }}
        </div>
      </div>
    </div>

    @if (loadingTicket()) {
      <div class="space-y-3">
        <div class="skeleton h-24"></div>
        <div class="skeleton h-36"></div>
      </div>
    }

    @if (!loadingTicket() && ticketError()) {
      <div class="p-4 bg-red-50 text-red-700 rounded-xl">
        {{ ticketError() }}
      </div>
    }

    @if (!loadingTicket() && !ticketError()) {
      @if (ticket(); as ticketActual) {
        <div class="space-y-6">
          <article class="rounded-2xl border border-gray-100 bg-slate-50 p-6 space-y-4">
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p class="text-sm text-gray-500">{{ ticketActual.codigo }}</p>
                <h2 class="text-2xl font-semibold text-gray-900">{{ ticketActual.equipo }}</h2>
                <p class="text-sm text-gray-500">Cliente: {{ ticketActual.cliente }}</p>
              </div>
              <div class="flex flex-wrap gap-2">
                <span class="chip" [ngClass]="ticketActual.prioridad === 'Alta' ? 'text-red-600 bg-red-50' : ticketActual.prioridad === 'Media' ? 'text-amber-600 bg-amber-50' : 'text-emerald-600 bg-emerald-50'">{{ ticketActual.prioridad }}</span>
                @if (ticketActual.tecnicoAsignado) {
                  <span class="chip bg-white border border-gray-200 text-gray-700">{{ ticketActual.tecnicoAsignado }}</span>
                }
              </div>
            </div>
            <dl class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
              <div>
                <dt class="text-gray-500">Ingreso</dt>
                <dd class="font-medium text-gray-900">{{ ticketActual.ingreso ? (ticketActual.ingreso | date:'short') : '—' }}</dd>
              </div>
              <div>
                <dt class="text-gray-500">Entrega estimada</dt>
                <dd class="font-medium text-gray-900">{{ ticketActual.entregaEstimada ? (ticketActual.entregaEstimada | date:'short') : '—' }}</dd>
              </div>
              <div>
                <dt class="text-gray-500">Último movimiento</dt>
                <dd class="font-medium text-gray-900">{{ ticketActual.ultimoMovimiento ? (ticketActual.ultimoMovimiento | date:'short') : '—' }}</dd>
              </div>
            </dl>
            @if (ticketActual.diagnostico) {
              <p class="text-sm text-gray-600">Reporte del cliente: {{ ticketActual.diagnostico }}</p>
            }
          </article>
          <article class="space-y-6">
            <div>
              <label class="block text-sm font-semibold text-gray-800 mb-2">Diagnóstico técnico *</label>
              <textarea rows="4" class="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-100" [value]="diagnosticoTecnico()" (input)="actualizarDiagnostico($any($event.target).value)"></textarea>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-semibold text-gray-800 mb-2">Acciones realizadas</label>
                <textarea rows="4" class="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Pruebas ejecutadas, componentes ajustados..." [value]="accionesRealizadas()" (input)="actualizarAcciones($any($event.target).value)"></textarea>
              </div>
              <div>
                <label class="block text-sm font-semibold text-gray-800 mb-2">Piezas utilizadas (una por línea)</label>
                <textarea rows="4" class="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Flex display 14''\nCable LVDS" [value]="piezasTexto()" (input)="actualizarPiezas($any($event.target).value)"></textarea>
              </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <label class="text-sm text-gray-600 space-y-2">
                Tiempo empleado (horas)
                <input type="number" min="0" step="0.5" class="w-full rounded-2xl border border-gray-200 px-4 py-2.5 text-sm text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-100" [value]="tiempoHoras()" (input)="actualizarTiempo($any($event.target).value)">
              </label>
              <label class="text-sm text-gray-600 space-y-2">
                Costo estimado (₡)
                <input type="number" min="0" class="w-full rounded-2xl border border-gray-200 px-4 py-2.5 text-sm text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-100" [value]="costoEstimado()" (input)="actualizarCosto($any($event.target).value)">
              </label>
            </div>
            <div class="flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 pt-6">
              @if (ticketActual.piezasUtilizadas?.length) {
                <div class="text-sm text-gray-500">
                  Piezas registradas: <span class="font-medium text-gray-900">{{ ticketActual.piezasUtilizadas?.length }}</span>
                </div>
              }
              <button type="button" class="px-6 py-3 rounded-2xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-60" [disabled]="!puedeGuardar()" (click)="registrarReparacion()">
                {{ guardando() ? 'Guardando...' : 'Finalizar reparación' }}
              </button>
            </div>
          </article>
        </div>
      } @else {
        <div class="p-6 border border-dashed border-gray-200 rounded-2xl text-center text-gray-500">
          Selecciona un ticket desde la cola de mantenimiento o ingresa un ID válido para comenzar a documentar el diagnóstico.
        </div>
      }
    }
  </section>
</div>
  `,
  styles: [`
section {
	@apply rounded-2xl border border-gray-100 bg-white shadow-sm;
}

.chip {
	@apply inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold;
}

.skeleton {
	@apply rounded-2xl bg-gray-100 animate-pulse;
}

  `],
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
