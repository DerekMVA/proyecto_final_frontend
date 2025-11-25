import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { catchError, EMPTY, finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ComprasService } from '../../../core/services/compras.service';
import { CompraCrear } from '../../../core/models/compra';
import { ProveedoresService } from '../../../core/services/proveedores.service';
import { Proveedor } from '../../../core/models/proveedor';
import { NotificacionesService } from '../../../core/services/notificaciones.service';

@Component({
  selector: 'app-registrar-compra',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
<div class="p-8">
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
    <h1 class="text-3xl font-bold text-gray-800">Registrar Nueva Compra</h1>
    <a routerLink="/entradas" class="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900">
      <span aria-hidden="true">&#8592;</span>
      Volver a Entradas
    </a>
  </div>

  <form class="bg-white rounded-lg shadow-md border border-gray-100" [formGroup]="form" (ngSubmit)="enviar()">
    <div class="p-6 space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="flex flex-col gap-2">
          <label class="flex flex-col gap-1">
            <span class="text-sm font-medium text-gray-700">Proveedor</span>
            <select formControlName="idProveedor"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-gray-200"
              [disabled]="proveedoresCargando() || !proveedores().length">
              <option value="">Selecciona un proveedor</option>
              @for (proveedor of proveedores(); track proveedor) {
                <option [value]="proveedor.id">
                  {{ proveedor.nombre }}
                </option>
              }
            </select>
            @if (proveedoresCargando()) {
              <span class="text-xs text-gray-500">Cargando proveedores…</span>
            }
            @if (!proveedoresCargando() && proveedoresError()) {
              <span class="text-xs text-red-600">
                {{ proveedoresError() }}
              </span>
            }
            @if (!proveedoresCargando() && !proveedoresError() && !proveedores().length) {
              <span class="text-xs text-amber-600">
                No hay proveedores disponibles. Registra un proveedor antes de continuar.
              </span>
            }
            @if (form.get('idProveedor')?.touched && form.get('idProveedor')?.invalid) {
              <span class="text-xs text-red-600">
                Selecciona un proveedor.
              </span>
            }
          </label>

          <div class="flex flex-wrap gap-3 items-center text-sm">
            <button type="button"
              class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
              (click)="toggleFormularioProveedor()">
              {{ proveedorFormVisible() ? 'Ocultar formulario' : 'Registrar proveedor' }}
            </button>
            @if (proveedorSeleccionado()) {
              <span class="text-gray-600">
                {{ proveedorSeleccionado()?.contacto || 'Sin contacto' }} • {{ proveedorSeleccionado()?.telefono || 'Sin teléfono' }}
              </span>
            }
          </div>
        </div>

        <label class="flex flex-col gap-1">
          <span class="text-sm font-medium text-gray-700">Fecha de compra</span>
          <input type="date" formControlName="fecha"
            class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-gray-200" />
            @if (form.get('fecha')?.touched && form.get('fecha')?.invalid) {
              <span class="text-xs text-red-600">
                Selecciona una fecha válida.
              </span>
            }
          </label>

          <label class="flex flex-col gap-1 md:col-span-2">
            <span class="text-sm font-medium text-gray-700">Observaciones</span>
            <textarea rows="3" formControlName="observaciones"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-gray-200"
            placeholder="Notas adicionales sobre la compra"></textarea>
            @if (form.get('observaciones')?.errors?.['maxlength']) {
              <span class="text-xs text-red-600">
                Máximo 500 caracteres.
              </span>
            }
          </label>
        </div>

        @if (proveedorSeleccionado()) {
          <div class="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <h3 class="text-sm font-semibold text-gray-700 mb-2">Datos del proveedor seleccionado</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
              <p><span class="font-medium text-gray-800">Nombre:</span> {{ proveedorSeleccionado()?.nombre }}</p>
              <p><span class="font-medium text-gray-800">Contacto:</span> {{ proveedorSeleccionado()?.contacto || 'Sin definir' }}</p>
              <p><span class="font-medium text-gray-800">Teléfono:</span> {{ proveedorSeleccionado()?.telefono || 'Sin definir' }}</p>
              <p><span class="font-medium text-gray-800">Correo:</span> {{ proveedorSeleccionado()?.correo || 'Sin definir' }}</p>
            </div>
          </div>
        }

        @if (proveedorFormVisible()) {
          <div class="border border-gray-200 rounded-lg">
            <div class="px-4 py-3 border-b border-gray-200 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between bg-white rounded-t-lg">
              <div>
                <h3 class="text-base font-semibold text-gray-800">Registrar nuevo proveedor</h3>
                <p class="text-sm text-gray-500">Se guardará y quedará seleccionado automáticamente.</p>
              </div>
              <button type="button" class="text-sm text-gray-600 hover:text-gray-900" (click)="toggleFormularioProveedor()">
                Cerrar
              </button>
            </div>
            <div class="p-4 bg-gray-50" [formGroup]="formProveedor">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label class="flex flex-col gap-1">
                  <span class="text-sm font-medium text-gray-700">Nombre</span>
                  <input type="text" formControlName="nombre"
                    class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-gray-200"
                    placeholder="Proveedor S.A." />
                    @if (formProveedor.get('nombre')?.touched && formProveedor.get('nombre')?.invalid) {
                      <span class="text-xs text-red-600">
                        El nombre es obligatorio.
                      </span>
                    }
                  </label>
                  <label class="flex flex-col gap-1">
                    <span class="text-sm font-medium text-gray-700">Contacto</span>
                    <input type="text" formControlName="contacto"
                      class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-gray-200"
                      placeholder="Persona de contacto" />
                    </label>
                    <label class="flex flex-col gap-1">
                      <span class="text-sm font-medium text-gray-700">Teléfono</span>
                      <input type="text" formControlName="telefono"
                        class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-gray-200"
                        placeholder="0000-0000" />
                      </label>
                      <label class="flex flex-col gap-1">
                        <span class="text-sm font-medium text-gray-700">Correo</span>
                        <input type="email" formControlName="correo"
                          class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-gray-200"
                          placeholder="compras@proveedor.com" />
                          @if (formProveedor.get('correo')?.errors?.['email']) {
                            <span class="text-xs text-red-600">
                              Ingresa un correo válido.
                            </span>
                          }
                        </label>
                        <label class="flex flex-col gap-1 md:col-span-2">
                          <span class="text-sm font-medium text-gray-700">Dirección</span>
                          <textarea rows="2" formControlName="direccion"
                            class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-gray-200"
                          placeholder="Ubicación o instrucciones de entrega"></textarea>
                        </label>
                      </div>
                      @if (proveedorFormError()) {
                        <div class="mt-3 text-sm text-red-600">
                          {{ proveedorFormError() }}
                        </div>
                      }
                      <div class="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                        <button type="button" class="px-4 py-2 rounded-lg border border-gray-300 text-gray-700"
                          (click)="toggleFormularioProveedor()" [disabled]="proveedorSubmitting()">
                          Cancelar
                        </button>
                        <button type="button"
                          class="px-5 py-2 rounded-lg bg-gray-800 text-white font-semibold hover:bg-gray-900 transition disabled:opacity-50"
                          (click)="enviarProveedor()" [disabled]="proveedorSubmitting()">
                          {{ proveedorSubmitting() ? 'Guardando…' : 'Guardar proveedor' }}
                        </button>
                      </div>
                    </div>
                  </div>
                }

                <div>
                  <div class="flex items-center justify-between mb-4">
                    <h2 class="text-xl font-semibold text-gray-800">Productos</h2>
                    <button type="button"
                      class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 text-white text-sm font-semibold hover:bg-gray-900 transition disabled:opacity-50"
                      (click)="agregarDetalle()" [disabled]="submitting()">
                      Agregar producto
                    </button>
                  </div>

                  <div class="space-y-4" formArrayName="detalles">
                    @for (detalle of detalles.controls; track trackByDetalle(i, detalle); let i = $index) {
                      <div
                        class="border border-gray-200 rounded-lg p-4" [formGroupName]="i">
                        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                          <label class="flex flex-col gap-1 lg:col-span-2">
                            <span class="text-sm font-medium text-gray-700">Descripción del producto</span>
                            <input type="text" formControlName="descripcion"
                              class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-gray-200"
                              placeholder="Ej: Tarjeta madre X123" />
                              @if (detalle.get('descripcion')?.touched && detalle.get('descripcion')?.invalid) {
                                <span class="text-xs text-red-600"
                                  >
                                  La descripción es obligatoria.
                                </span>
                              }
                            </label>
                            <div class="grid grid-cols-2 gap-4 lg:grid-cols-1 lg:gap-4">
                              <label class="flex flex-col gap-1">
                                <span class="text-sm font-medium text-gray-700">Cantidad</span>
                                <input type="number" formControlName="cantidad" min="1" step="1"
                                  class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-gray-200" />
                                  @if (detalle.get('cantidad')?.touched && detalle.get('cantidad')?.invalid) {
                                    <span class="text-xs text-red-600"
                                      >
                                      Ingresa una cantidad mayor a cero.
                                    </span>
                                  }
                                </label>
                                <label class="flex flex-col gap-1">
                                  <span class="text-sm font-medium text-gray-700">Precio unitario</span>
                                  <input type="number" formControlName="precioUnitario" min="0" step="0.01"
                                    class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-gray-200" />
                                    @if (detalle.get('precioUnitario')?.touched && detalle.get('precioUnitario')?.invalid) {
                                      <span class="text-xs text-red-600"
                                        >
                                        Ingresa un precio mayor a cero.
                                      </span>
                                    }
                                  </label>
                                </div>
                              </div>
                              <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <span class="text-sm text-gray-600">
                                  Subtotal: <span class="font-semibold text-gray-800">{{ calcularSubtotal(i) | currency:'CRC':'symbol-narrow':'1.2-2' }}</span>
                                </span>
                                <button type="button"
                                  class="text-sm text-red-600 font-semibold hover:underline disabled:text-gray-400 disabled:cursor-not-allowed"
                                  (click)="eliminarDetalle(i)" [disabled]="detalles.length <= detallesMinimos || submitting()">
                                  Eliminar
                                </button>
                              </div>
                            </div>
                          }
                        </div>

                        @if (!tieneLineas()) {
                          <div class="mt-4 text-sm text-red-600">
                            Agrega al menos un producto.
                          </div>
                        }
                      </div>
                    </div>

                    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-t border-gray-100 px-6 py-4 bg-gray-50 rounded-b-lg">
                      <div class="text-sm text-gray-600">
                        Total estimado
                        <span class="block text-2xl font-semibold text-gray-900">{{ total() | currency:'CRC':'symbol-narrow':'1.2-2' }}</span>
                      </div>
                      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                        <button type="button" class="px-4 py-2 rounded-lg border border-gray-300 text-gray-700"
                          (click)="cancelar()" [disabled]="submitting()">
                          Cancelar
                        </button>
                        <button type="submit"
                          class="px-5 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 transition disabled:opacity-50"
                          [disabled]="submitting() || proveedoresCargando() || !proveedores().length">
                          {{ submitting() ? 'Guardando…' : 'Registrar compra' }}
                        </button>
                      </div>
                    </div>

                    @if (submitError()) {
                      <div class="px-6 pb-6 text-sm text-red-600">
                        {{ submitError() }}
                      </div>
                    }
                  </form>
                </div>
  `,
  styles: [`

  `],
})
export class RegistrarCompra {
  private readonly fb = inject(FormBuilder);
  private readonly comprasService = inject(ComprasService);
  private readonly proveedoresService = inject(ProveedoresService);
  private readonly notificaciones = inject(NotificacionesService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly proveedores = signal<Proveedor[]>([]);
  readonly proveedoresCargando = signal<boolean>(true);
  readonly proveedoresError = signal<string | null>(null);
  readonly proveedorFormVisible = signal<boolean>(false);
  readonly proveedorFormError = signal<string | null>(null);
  readonly proveedorSubmitting = signal<boolean>(false);
  readonly submitting = signal<boolean>(false);
  readonly submitError = signal<string | null>(null);
  readonly total = signal<number>(0);

  readonly detallesMinimos = 1;

  readonly form = this.fb.group({
    idProveedor: this.fb.control<number | null>(null, { validators: [Validators.required] }),
    fecha: this.fb.control<string>('', { validators: [Validators.required] }),
    observaciones: this.fb.control<string>('', { validators: [Validators.maxLength(500)] }),
    detalles: this.fb.array([this.crearDetalleGrupo()])
  });

  readonly tieneLineas = computed(() => this.detalles.length > 0);
  readonly proveedorSeleccionado = computed(() => {
    const idProveedor = this.form.value.idProveedor;
    if (!idProveedor) {
      return null;
    }
    return this.proveedores().find(p => p.id === idProveedor) ?? null;
  });

  readonly formProveedor = this.fb.group({
    nombre: this.fb.control<string>('', {
      validators: [Validators.required, Validators.maxLength(150)]
    }),
    contacto: this.fb.control<string>('', { validators: [Validators.maxLength(150)] }),
    telefono: this.fb.control<string>('', { validators: [Validators.maxLength(50)] }),
    correo: this.fb.control<string>('', { validators: [Validators.email, Validators.maxLength(150)] }),
    direccion: this.fb.control<string>('', { validators: [Validators.maxLength(300)] })
  });

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.recalcularTotal();
    });
    this.form.patchValue({ fecha: this.fechaActualISO() });
    this.cargarProveedores();
    this.recalcularTotal();
  }

  get detalles(): FormArray {
    return this.form.get('detalles') as FormArray;
  }

  agregarDetalle(): void {
    this.detalles.push(this.crearDetalleGrupo());
    this.recalcularTotal();
  }

  eliminarDetalle(index: number): void {
    if (this.detalles.length <= this.detallesMinimos) {
      this.notificaciones.error('La compra debe incluir al menos un producto.');
      return;
    }
    this.detalles.removeAt(index);
    this.recalcularTotal();
  }

  calcularSubtotal(index: number): number {
    const grupo = this.detalles.at(index);
    if (!grupo) {
      return 0;
    }
    const cantidad = Number(grupo.get('cantidad')?.value ?? 0);
    const precio = Number(grupo.get('precioUnitario')?.value ?? 0);
    const subtotal = cantidad * precio;
    return Number.isFinite(subtotal) ? subtotal : 0;
  }

  toggleFormularioProveedor(): void {
    const visible = !this.proveedorFormVisible();
    this.proveedorFormVisible.set(visible);
    if (!visible) {
      this.formProveedor.reset();
      this.proveedorFormError.set(null);
    }
  }

  enviarProveedor(): void {
    if (this.formProveedor.invalid) {
      this.formProveedor.markAllAsTouched();
      this.proveedorFormError.set('Revisa los datos del proveedor.');
      return;
    }

    const payload = {
      nombre: this.normalizarTexto(this.formProveedor.value.nombre) ?? '',
      contacto: this.normalizarTexto(this.formProveedor.value.contacto),
      telefono: this.normalizarTexto(this.formProveedor.value.telefono),
      correo: this.normalizarTexto(this.formProveedor.value.correo),
      direccion: this.normalizarTexto(this.formProveedor.value.direccion)
    };

    if (!payload.nombre) {
      this.proveedorFormError.set('El nombre del proveedor es obligatorio.');
      return;
    }

    this.proveedorSubmitting.set(true);
    this.proveedorFormError.set(null);

    this.proveedoresService
      .crearProveedor(payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.proveedorSubmitting.set(false)),
        catchError(error => {
          console.error('No se pudo registrar el proveedor', error);
          this.proveedorFormError.set('No se pudo registrar el proveedor. Intenta nuevamente.');
          this.notificaciones.error('No se pudo registrar el proveedor.');
          return EMPTY;
        })
      )
      .subscribe(proveedor => {
        this.notificaciones.exito(`Proveedor ${proveedor.nombre} registrado.`);
        this.proveedores.update(actuales => [...actuales, proveedor]);
        this.form.patchValue({ idProveedor: proveedor.id });
        this.toggleFormularioProveedor();
      });
  }

  enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notificaciones.error('Revisa los campos del formulario.');
      return;
    }

    const idProveedor = this.form.value.idProveedor;
    const fecha = this.form.value.fecha;
    if (!idProveedor || !fecha) {
      this.notificaciones.error('Selecciona un proveedor y una fecha válidos.');
      return;
    }

    const detallesValidos = this.detalles.controls
      .map(control => control.value as {
        descripcion: string | null;
        cantidad: number | null;
        precioUnitario: number | null;
      })
      .filter(detalle => {
        const descripcion = this.normalizarTexto(detalle.descripcion);
        const cantidad = Number(detalle.cantidad);
        const precio = Number(detalle.precioUnitario);
        return descripcion && cantidad > 0 && precio > 0;
      })
      .map(detalle => ({
        descripcion: this.normalizarTexto(detalle.descripcion)!,
        cantidad: Number(detalle.cantidad),
        precioUnitario: Number(detalle.precioUnitario)
      }));

    if (!detallesValidos.length) {
      this.notificaciones.error('Agrega al menos un producto con cantidad y precio válidos.');
      return;
    }

    const payload: CompraCrear = {
      idProveedor,
      fecha,
      observaciones: this.normalizarTexto(this.form.value.observaciones),
      detalles: detallesValidos
    };

    this.submitting.set(true);
    this.submitError.set(null);

    this.comprasService
      .crearCompra(payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.submitting.set(false)),
        catchError(error => {
          console.error('No se pudo registrar la compra', error);
          this.submitError.set('No se pudo registrar la compra. Intenta nuevamente.');
          this.notificaciones.error('No se pudo registrar la compra.');
          return EMPTY;
        })
      )
      .subscribe(compra => {
        this.notificaciones.exito(`Compra ${compra.codigo ?? ''} registrada correctamente.`.trim());
        this.router.navigate(['/entradas']);
      });
  }

  trackByDetalle(index: number, _control: AbstractControl): number {
    return index;
  }

  cancelar(): void {
    this.router.navigate(['/entradas']);
  }

  private crearDetalleGrupo() {
    return this.fb.group({
      descripcion: this.fb.control<string>('', {
        validators: [Validators.required, Validators.maxLength(200)]
      }),
      cantidad: this.fb.control<number | null>(null, {
        validators: [Validators.required, Validators.min(1)]
      }),
      precioUnitario: this.fb.control<number | null>(null, {
        validators: [Validators.required, Validators.min(0.01)]
      })
    });
  }

  private cargarProveedores(): void {
    this.proveedoresCargando.set(true);
    this.proveedoresError.set(null);

    this.proveedoresService
      .obtenerProveedores()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.proveedoresCargando.set(false)),
        catchError(error => {
          console.error('No se pudieron cargar los proveedores', error);
          this.proveedoresError.set('No se pudo cargar la lista de proveedores. Intenta nuevamente.');
          this.notificaciones.error('No se pudo cargar la lista de proveedores.');
          return EMPTY;
        })
      )
      .subscribe(proveedores => {
        const activos = proveedores.filter(proveedor => !(proveedor.deleted ?? false));
        this.proveedores.set(activos);
        if (activos.length === 0) {
          this.notificaciones.info('No hay proveedores registrados. Registra uno antes de crear compras.');
          this.proveedorFormVisible.set(true);
        }
      });
  }

  private recalcularTotal(): void {
    const total = this.detalles.controls.reduce((acc, control) => {
      const cantidad = Number(control.get('cantidad')?.value ?? 0);
      const precio = Number(control.get('precioUnitario')?.value ?? 0);
      const subtotal = cantidad * precio;
      return acc + (Number.isFinite(subtotal) ? subtotal : 0);
    }, 0);
    this.total.set(Number.isFinite(total) ? total : 0);
  }

  private normalizarTexto(valor?: string | null): string | null {
    if (valor === undefined || valor === null) {
      return null;
    }
    const limpio = valor.trim();
    return limpio ? limpio : null;
  }

  private fechaActualISO(): string {
    return new Date().toISOString().split('T')[0];
  }
}
