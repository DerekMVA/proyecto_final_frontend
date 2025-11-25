
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, finalize } from 'rxjs';
import { ClientesService } from '../../../core/services/clientes.service';
import { TecnicosService } from '../../../core/services/tecnicos.service';
import { OrdenesService } from '../../../core/services/ordenes.service';
import { Cliente } from '../../../core/models/cliente';
import { Tecnico } from '../../../core/models/tecnico';
import { CrearOrdenPayload, PrioridadOrden, TipoOrden } from '../../../core/models/orden';
import { NotificacionesService } from '../../../core/services/notificaciones.service';

@Component({
  selector: 'app-crear-orden',
  imports: [RouterLink, FormsModule],
  template: `
<div class="p-6 lg:p-8 space-y-6">
  <div class="flex flex-wrap items-center justify-between gap-4">
    <div>
      <p class="text-sm font-semibold text-indigo-600 uppercase tracking-tight">Nueva orden</p>
      <h1 class="text-3xl font-bold text-gray-900">Registrar orden de trabajo</h1>
      <p class="text-sm text-gray-500">Captura la solicitud del cliente y asigna el flujo correcto.</p>
    </div>
    <a routerLink="/ordenes" class="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 font-medium hover:border-gray-300">Volver a la lista</a>
  </div>

  <section class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <article class="lg:col-span-2 formulario-panel">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label class="campo">
          <span>Tipo de orden</span>
          <select class="input" [ngModel]="tipo()" (ngModelChange)="actualizarTipo($event)" name="tipo">
            @for (tipoItem of tipos; track tipoItem) {
              <option [value]="tipoItem">{{ tipoItem }}</option>
            }
          </select>
        </label>
        <label class="campo">
          <span>Prioridad</span>
          <select class="input" [ngModel]="prioridad()" (ngModelChange)="actualizarPrioridad($event)" name="prioridad">
            @for (prioridadItem of prioridades; track prioridadItem) {
              <option [value]="prioridadItem">{{ prioridadItem }}</option>
            }
          </select>
        </label>
        <label class="campo">
          <span>Canal</span>
          <select class="input" [ngModel]="canal()" (ngModelChange)="actualizarCanal($event)" name="canal">
            @for (canalItem of canales; track canalItem) {
              <option [value]="canalItem">{{ canalItem }}</option>
            }
          </select>
        </label>
        <label class="campo">
          <span>Asignar técnico (opcional)</span>
          <select class="input" [ngModel]="tecnicoId() ?? ''" (ngModelChange)="seleccionarTecnico($event)" name="tecnico">
            <option value="">Sin asignar</option>
            @if (!cargandoTecnicos()) {
              @for (tecnico of tecnicos(); track tecnico) {
                <option [value]="tecnico.id">{{ tecnico.nombre }} {{ tecnico.especialidad ? '(' + tecnico.especialidad + ')' : '' }}</option>
              }
            } @else {
              <option disabled>Cargando técnicos...</option>
            }
          </select>
        </label>
      </div>

      @if (tecnicosError()) {
        <p class="mensaje-error">{{ tecnicosError() }}</p>
      }

      <label class="campo">
        <span>Cliente</span>
        <select class="input" [ngModel]="clienteId() ?? ''" (ngModelChange)="seleccionarCliente($event)" name="cliente">
          <option value="" disabled>Selecciona un cliente</option>
          @if (!cargandoClientes()) {
            @for (cliente of clientes(); track cliente) {
              <option [value]="cliente.id">{{ cliente.nombre }}</option>
            }
          } @else {
            <option disabled>Cargando clientes...</option>
          }
        </select>
      </label>
      @if (clientesError()) {
        <p class="mensaje-error">{{ clientesError() }}</p>
      }

      <label class="campo">
        <span>Descripción / detalle del trabajo</span>
        <textarea rows="5" class="textarea" [ngModel]="descripcion()" (ngModelChange)="actualizarDescripcion($event)" name="descripcion" placeholder="Ej: Ensamblar PC gamer basándonos en la cotización #123."></textarea>
        <span class="text-xs text-gray-500">Mínimo 10 caracteres. Actual: {{ descripcion().length }}</span>
      </label>

      <label class="campo">
        <span>Observaciones internas</span>
        <textarea rows="3" class="textarea" [ngModel]="observaciones()" (ngModelChange)="actualizarObservaciones($event)" name="observaciones" placeholder="Notas adicionales, requerimientos especiales, etc."></textarea>
      </label>

      <div class="pt-4">
        <button type="button" class="boton-primario" [disabled]="!puedeRegistrar()" (click)="registrarOrden()">
          {{ creando() ? 'Registrando...' : 'Crear orden' }}
        </button>
      </div>
    </article>

    <article class="resumen-panel space-y-4">
      <h2 class="text-lg font-semibold text-gray-900">Resumen</h2>
      <ul class="space-y-2 text-sm text-gray-600">
        <li>Tipo seleccionado: <span class="font-semibold text-gray-900">{{ tipo() }}</span></li>
        <li>Cliente: <span class="font-semibold text-gray-900">{{ clienteSeleccionado()?.nombre || 'Pendiente' }}</span></li>
        <li>Prioridad: <span class="font-semibold text-gray-900">{{ prioridad() }}</span></li>
        <li>Canal: <span class="font-semibold text-gray-900">{{ canal() }}</span></li>
        <li>Técnico: <span class="font-semibold text-gray-900">{{ tecnicoSeleccionado()?.nombre || 'Sin asignar' }}</span></li>
      </ul>
      <div class="p-4 rounded-xl bg-indigo-50 text-indigo-900 text-sm">
        Asegúrate de detallar correctamente el problema o requerimiento del cliente para evitar reprocesos en taller.
      </div>
    </article>
  </section>
</div>
  `,
  styles: [`
.formulario-panel {
	@apply rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4;
}

.resumen-panel {
	@apply rounded-2xl border border-gray-100 bg-white p-6 shadow-sm;
}

.campo {
	@apply flex flex-col gap-1 text-sm text-gray-600;
}

.input,
.textarea {
	@apply rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100;
}

.textarea {
	@apply resize-none;
}

.boton-primario {
	@apply w-full rounded-xl bg-indigo-600 text-white font-semibold px-4 py-2.5 hover:bg-indigo-700 disabled:opacity-50;
}

.mensaje-error {
	@apply text-sm text-red-600;
}

  `],
})
export class CrearOrden {
  private readonly clientesService = inject(ClientesService);
  private readonly tecnicosService = inject(TecnicosService);
  private readonly ordenesService = inject(OrdenesService);
  private readonly notificaciones = inject(NotificacionesService);
  private readonly destroyRef = inject(DestroyRef);

  readonly clientes = signal<Cliente[]>([]);
  readonly tecnicos = signal<Tecnico[]>([]);
  readonly cargandoClientes = signal<boolean>(true);
  readonly cargandoTecnicos = signal<boolean>(true);
  readonly clientesError = signal<string | null>(null);
  readonly tecnicosError = signal<string | null>(null);

  readonly tipo = signal<TipoOrden>('Ensamble');
  readonly clienteId = signal<number | null>(null);
  readonly descripcion = signal<string>('');
  readonly prioridad = signal<PrioridadOrden>('Media');
  readonly tecnicoId = signal<number | null>(null);
  readonly canal = signal<string>('Mostrador');
  readonly observaciones = signal<string>('');
  readonly creando = signal<boolean>(false);

  readonly tipos: TipoOrden[] = ['Ensamble', 'Mantenimiento'];
  readonly prioridades: PrioridadOrden[] = ['Alta', 'Media', 'Baja'];
  readonly canales = ['Mostrador', 'Correo', 'Teléfono', 'Web'];

  readonly puedeRegistrar = computed(() => {
    const descripcion = this.descripcion().trim();
    return !!this.clienteId() && descripcion.length >= 10 && !this.creando();
  });

  readonly clienteSeleccionado = computed(() => this.clientes().find(cliente => cliente.id === this.clienteId()) ?? null);
  readonly tecnicoSeleccionado = computed(() => this.tecnicos().find(tecnico => tecnico.id === this.tecnicoId()) ?? null);

  constructor() {
    this.cargarClientes();
    this.cargarTecnicos();
  }

  actualizarTipo(valor: string): void {
    if (this.tipos.includes(valor as TipoOrden)) {
      this.tipo.set(valor as TipoOrden);
    }
  }

  seleccionarCliente(valor: string): void {
    const id = Number(valor);
    this.clienteId.set(Number.isFinite(id) ? id : null);
  }

  actualizarDescripcion(valor: string): void {
    this.descripcion.set(valor);
  }

  actualizarPrioridad(valor: string): void {
    if (this.prioridades.includes(valor as PrioridadOrden)) {
      this.prioridad.set(valor as PrioridadOrden);
    }
  }

  actualizarCanal(valor: string): void {
    this.canal.set(valor);
  }

  seleccionarTecnico(valor: string): void {
    if (!valor) {
      this.tecnicoId.set(null);
      return;
    }
    const id = Number(valor);
    this.tecnicoId.set(Number.isFinite(id) ? id : null);
  }

  actualizarObservaciones(valor: string): void {
    this.observaciones.set(valor);
  }

  registrarOrden(): void {
    if (!this.puedeRegistrar()) {
      return;
    }

    const payload: CrearOrdenPayload = {
      tipo: this.tipo(),
      clienteId: this.clienteId()!,
      descripcion: this.descripcion().trim(),
      prioridad: this.prioridad(),
      tecnicoId: this.tecnicoId(),
      canal: this.canal().trim() || null,
      observaciones: this.observaciones().trim() || null
    };

    this.creando.set(true);

    this.ordenesService
      .crearOrden(payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.creando.set(false)),
        catchError(error => {
          console.error('No se pudo registrar la orden de trabajo', error);
          this.notificaciones.error('No se pudo crear la orden.');
          return EMPTY;
        })
      )
      .subscribe(orden => {
        this.notificaciones.exito(`Orden ${orden.codigo} creada correctamente.`);
        this.reiniciarFormulario();
      });
  }

  private cargarClientes(): void {
    this.cargandoClientes.set(true);
    this.clientesError.set(null);

    this.clientesService
      .obtenerClientes()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cargandoClientes.set(false)),
        catchError(error => {
          console.error('No se pudieron cargar los clientes para las órdenes', error);
          this.clientesError.set('No se pudo cargar la lista de clientes.');
          this.notificaciones.error('No se pudo obtener la lista de clientes.');
          return EMPTY;
        })
      )
      .subscribe(clientes => {
        this.clientes.set(clientes);
      });
  }

  private cargarTecnicos(): void {
    this.cargandoTecnicos.set(true);
    this.tecnicosError.set(null);

    this.tecnicosService
      .obtenerTecnicos()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cargandoTecnicos.set(false)),
        catchError(error => {
          console.error('No se pudieron cargar los técnicos', error);
          this.tecnicosError.set('No se pudo cargar la lista de técnicos.');
          this.notificaciones.error('No se pudo obtener la lista de técnicos.');
          return EMPTY;
        })
      )
      .subscribe(tecnicos => {
        this.tecnicos.set(tecnicos);
      });
  }

  private reiniciarFormulario(): void {
    this.tipo.set('Ensamble');
    this.clienteId.set(null);
    this.descripcion.set('');
    this.prioridad.set('Media');
    this.tecnicoId.set(null);
    this.canal.set('Mostrador');
    this.observaciones.set('');
  }

}
