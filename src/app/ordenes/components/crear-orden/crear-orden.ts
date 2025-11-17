import { CommonModule } from '@angular/common';
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
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './crear-orden.html',
  styleUrl: './crear-orden.css'
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
