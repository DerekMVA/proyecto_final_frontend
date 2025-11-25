
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, EMPTY, finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProveedoresService } from '../../../core/services/proveedores.service';
import { Proveedor } from '../../../core/models/proveedor';
import { NotificacionesService } from '../../../core/services/notificaciones.service';

@Component({
  selector: 'app-gestion-proveedores',
  imports: [RouterLink, ReactiveFormsModule],
  template: `
<div class="p-8">
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
    <h1 class="text-3xl font-bold text-gray-800">Gestión de Proveedores</h1>
    <a routerLink="/entradas" class="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900">
      <span aria-hidden="true">&#8592;</span>
      Volver a Entradas
    </a>
  </div>

  <div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div class="flex gap-3">
      <button type="button"
        class="px-4 py-2 rounded-lg border transition font-medium bg-white text-gray-700 border-gray-300"
        [class.bg-gray-800]="estadoFiltro() === 'activos'"
        [class.text-white]="estadoFiltro() === 'activos'"
        [class.border-gray-800]="estadoFiltro() === 'activos'"
        (click)="cambiarFiltro('activos')">
        Activos
      </button>
      <button type="button"
        class="px-4 py-2 rounded-lg border transition font-medium bg-white text-gray-700 border-gray-300"
        [class.bg-gray-800]="estadoFiltro() === 'inactivos'"
        [class.text-white]="estadoFiltro() === 'inactivos'"
        [class.border-gray-800]="estadoFiltro() === 'inactivos'"
        (click)="cambiarFiltro('inactivos')">
        Inactivos
      </button>
      <button type="button"
        class="px-4 py-2 rounded-lg border transition font-medium bg-white text-gray-700 border-gray-300"
        [class.bg-gray-800]="estadoFiltro() === 'todos'"
        [class.text-white]="estadoFiltro() === 'todos'"
        [class.border-gray-800]="estadoFiltro() === 'todos'"
        (click)="cambiarFiltro('todos')">
        Todos
      </button>
    </div>

    <div class="flex flex-col gap-2 w-full sm:w-auto sm:flex-row sm:items-center sm:gap-3">
      <div class="relative w-full sm:w-72">
        <input type="search"
          class="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring focus:ring-gray-200"
          placeholder="Buscar por nombre, contacto o correo"
          [value]="busqueda()"
          (input)="actualizarBusqueda($any($event.target).value)" />
          @if (busqueda()) {
            <button type="button"
              class="absolute inset-y-0 right-2 flex items-center text-sm text-gray-500 hover:text-gray-700"
              (click)="actualizarBusqueda('')">
              Limpiar
            </button>
          }
        </div>

        <button type="button"
          class="px-4 py-2 rounded-lg bg-gray-800 text-white font-semibold hover:bg-gray-900 transition"
          (click)="abrirFormularioCrear()">
          Nuevo proveedor
        </button>
      </div>
    </div>

    @if (formVisible()) {
      <div class="mb-8 bg-white border border-gray-100 rounded-lg shadow">
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 class="text-xl font-semibold text-gray-800">{{ formTitle() }}</h2>
          <button type="button" class="text-sm text-gray-500 hover:text-gray-800" (click)="cerrarFormulario()">
            Cancelar
          </button>
        </div>
        <form class="px-6 py-6 space-y-4" [formGroup]="form" (ngSubmit)="enviarFormulario()">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label class="flex flex-col gap-1">
              <span class="text-sm font-medium text-gray-700">Nombre</span>
              <input type="text" formControlName="nombre"
                class="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-gray-200"
                placeholder="Ej: Componentes Globales" />
                @if (form.get('nombre')?.touched && form.get('nombre')?.invalid) {
                  <span class="text-xs text-red-600"
                    >
                    El nombre es obligatorio.
                  </span>
                }
              </label>
              <label class="flex flex-col gap-1">
                <span class="text-sm font-medium text-gray-700">Contacto</span>
                <input type="text" formControlName="contacto"
                  class="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-gray-200"
                  placeholder="Persona de contacto" />
                </label>
                <label class="flex flex-col gap-1">
                  <span class="text-sm font-medium text-gray-700">Teléfono</span>
                  <input type="text" formControlName="telefono"
                    class="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-gray-200"
                    placeholder="Ej: 8888-8888" />
                  </label>
                  <label class="flex flex-col gap-1">
                    <span class="text-sm font-medium text-gray-700">Correo electrónico</span>
                    <input type="email" formControlName="correo"
                      class="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-gray-200"
                      placeholder="Ej: compras@proveedor.com" />
                      @if (form.get('correo')?.touched && form.get('correo')?.errors?.['email']) {
                        <span class="text-xs text-red-600"
                          >
                          Ingresa un correo válido.
                        </span>
                      }
                    </label>
                    <label class="flex flex-col gap-1 md:col-span-2">
                      <span class="text-sm font-medium text-gray-700">Dirección</span>
                      <textarea rows="2" formControlName="direccion"
                        class="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-gray-200"
                      placeholder="Dirección física o instrucciones de entrega"></textarea>
                    </label>
                  </div>
                  @if (formError()) {
                    <div class="text-sm text-red-600">
                      {{ formError() }}
                    </div>
                  }
                  <div class="flex justify-end gap-3 pt-2">
                    <button type="button" class="px-4 py-2 rounded-lg border border-gray-300 text-gray-700"
                      (click)="cerrarFormulario()" [disabled]="formSubmitting()">
                      Cancelar
                    </button>
                    <button type="submit"
                      class="px-5 py-2 rounded-lg bg-gray-800 text-white font-semibold hover:bg-gray-900 transition disabled:opacity-50"
                      [disabled]="formSubmitting()">
                      {{ formSubmitting() ? 'Guardando…' : (isEditMode() ? 'Guardar cambios' : 'Registrar proveedor') }}
                    </button>
                  </div>
                </form>
              </div>
            }

            <div class="bg-white shadow-md rounded-lg overflow-hidden">
              @if (loading()) {
                <div class="p-6 text-center text-gray-500">Cargando proveedores…</div>
              }

              @if (!loading() && loadError()) {
                <div class="p-6 text-center text-red-600">
                  {{ loadError() }}
                </div>
              }

              @if (!loading() && !loadError()) {
                @if (hasProveedores()) {
                  <div class="overflow-x-auto">
                    <table class="min-w-full">
                      <thead class="bg-gray-100">
                        <tr>
                          <th class="p-4 text-left">Nombre</th>
                          <th class="p-4 text-left">Contacto</th>
                          <th class="p-4 text-left">Teléfono</th>
                          <th class="p-4 text-left">Correo</th>
                          <th class="p-4 text-center">Estado</th>
                          <th class="p-4 text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (proveedor of proveedoresFiltrados(); track proveedor) {
                          <tr class="border-b hover:bg-gray-50">
                            <td class="p-4 font-medium text-gray-800">{{ proveedor.nombre }}</td>
                            <td class="p-4 text-gray-600">{{ proveedor.contacto || '—' }}</td>
                            <td class="p-4 text-gray-600">{{ proveedor.telefono || '—' }}</td>
                            <td class="p-4 text-gray-600">{{ proveedor.correo || '—' }}</td>
                            <td class="p-4 text-center">
                              <span class="px-2 py-1 rounded-full text-xs"
                                [class.bg-green-200]="!(proveedor.deleted ?? false)"
                                [class.text-green-800]="!(proveedor.deleted ?? false)"
                                [class.bg-red-200]="proveedor.deleted ?? false"
                                [class.text-red-800]="proveedor.deleted ?? false">
                                {{ (proveedor.deleted ?? false) ? 'Inactivo' : 'Activo' }}
                              </span>
                            </td>
                            <td class="p-4 text-center">
                              <div class="flex items-center justify-center gap-3">
                                <button type="button"
                                  class="text-blue-600 hover:underline"
                                  (click)="abrirFormularioEditar(proveedor)"
                                  [disabled]="(proveedor.deleted ?? false)">
                                  Editar
                                </button>
                                @if (!(proveedor.deleted ?? false)) {
                                  <button type="button"
                                    class="text-red-600 hover:underline disabled:text-gray-400 disabled:cursor-not-allowed"
                                    [disabled]="deletingId() === proveedor.id"
                                    (click)="eliminarProveedor(proveedor)">
                                    {{ deletingId() === proveedor.id ? 'Desactivando…' : 'Desactivar' }}
                                  </button>
                                }
                                @if (proveedor.deleted ?? false) {
                                  <button type="button"
                                    class="text-green-600 hover:underline disabled:text-gray-400 disabled:cursor-not-allowed"
                                    [disabled]="restoringId() === proveedor.id"
                                    (click)="restaurarProveedor(proveedor)">
                                    {{ restoringId() === proveedor.id ? 'Restaurando…' : 'Reactivar' }}
                                  </button>
                                }
                              </div>
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                  <div class="px-6 py-4 border-t border-gray-100 text-sm text-gray-600">
                    {{ totalFiltrados() }} proveedor(es) coinciden con los filtros.
                  </div>
                } @else {
                  <div class="p-6 text-center text-gray-500">
                    {{ estadoFiltro() === 'activos'
                    ? 'No hay proveedores registrados.'
                    : estadoFiltro() === 'inactivos'
                    ? 'No hay proveedores inactivos.'
                    : 'No se encontraron proveedores para los filtros actuales.' }}
                  </div>
                }
              }
            </div>

          </div>
  `,
  styles: [`

  `],
})
export class GestionProveedores {
  private readonly proveedoresService = inject(ProveedoresService);
  private readonly notificaciones = inject(NotificacionesService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly isBrowser = typeof window !== 'undefined';

  readonly proveedores = signal<Proveedor[]>([]);
  readonly loading = signal<boolean>(true);
  readonly loadError = signal<string | null>(null);
  readonly busqueda = signal<string>('');
  readonly estadoFiltro = signal<'todos' | 'activos' | 'inactivos'>('activos');
  readonly deletingId = signal<number | null>(null);
  readonly restoringId = signal<number | null>(null);
  readonly formVisible = signal<boolean>(false);
  readonly formMode = signal<'create' | 'edit'>('create');
  readonly selectedProveedorId = signal<number | null>(null);
  readonly formSubmitting = signal<boolean>(false);
  readonly formError = signal<string | null>(null);

  readonly proveedoresFiltrados = computed(() => {
    const termino = this.busqueda().trim().toLowerCase();
    const estado = this.estadoFiltro();

    return this.proveedores().filter(proveedor => {
      const eliminado = proveedor.deleted ?? false;
      if (estado === 'activos' && eliminado) {
        return false;
      }
      if (estado === 'inactivos' && !eliminado) {
        return false;
      }

      if (!termino) {
        return true;
      }

      const campos = [
        proveedor.nombre,
        proveedor.contacto ?? '',
        proveedor.telefono ?? '',
        proveedor.correo ?? '',
        proveedor.direccion ?? ''
      ]
        .join(' ')
        .toLowerCase();

      return campos.includes(termino);
    });
  });

  readonly totalFiltrados = computed(() => this.proveedoresFiltrados().length);
  readonly hasProveedores = computed(() => this.totalFiltrados() > 0);
  readonly formTitle = computed(() =>
    this.formMode() === 'create' ? 'Registrar proveedor' : 'Editar proveedor'
  );
  readonly isEditMode = computed(() => this.formMode() === 'edit');

  readonly form = this.fb.group({
    nombre: this.fb.control('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(150)]
    }),
    contacto: this.fb.control('', { validators: [Validators.maxLength(150)] }),
    telefono: this.fb.control('', { validators: [Validators.maxLength(50)] }),
    correo: this.fb.control('', {
      validators: [Validators.maxLength(150), Validators.email]
    }),
    direccion: this.fb.control('', { validators: [Validators.maxLength(250)] })
  });

  constructor() {
    this.cargarProveedores();
  }

  actualizarBusqueda(valor: string): void {
    this.busqueda.set(valor);
  }

  cambiarFiltro(estado: 'todos' | 'activos' | 'inactivos'): void {
    if (this.estadoFiltro() === estado) {
      return;
    }
    this.estadoFiltro.set(estado);
  }

  abrirFormularioCrear(): void {
    this.formMode.set('create');
    this.selectedProveedorId.set(null);
    this.form.reset({ nombre: '', contacto: '', telefono: '', correo: '', direccion: '' });
    this.formError.set(null);
    this.formVisible.set(true);
  }

  abrirFormularioEditar(proveedor: Proveedor): void {
    this.formMode.set('edit');
    this.selectedProveedorId.set(proveedor.id);
    this.form.reset({
      nombre: proveedor.nombre ?? '',
      contacto: proveedor.contacto ?? '',
      telefono: proveedor.telefono ?? '',
      correo: proveedor.correo ?? '',
      direccion: proveedor.direccion ?? ''
    });
    this.formError.set(null);
    this.formVisible.set(true);
  }

  cerrarFormulario(): void {
    this.formVisible.set(false);
    this.formSubmitting.set(false);
    this.formError.set(null);
  }

  enviarFormulario(): void {
    if (!this.formVisible()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { nombre, contacto, telefono, correo, direccion } = this.form.getRawValue();
    const payload = {
      nombre: nombre.trim(),
      contacto: this.normalizarCampo(contacto),
      telefono: this.normalizarCampo(telefono),
      correo: this.normalizarCampo(correo),
      direccion: this.normalizarCampo(direccion)
    };

    if (!payload.nombre) {
      this.formError.set('El nombre del proveedor es obligatorio.');
      return;
    }

    this.formSubmitting.set(true);
    this.formError.set(null);

    if (this.formMode() === 'create') {
      this.proveedoresService
        .crearProveedor(payload)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          finalize(() => this.formSubmitting.set(false)),
          catchError(error => {
            console.error('No se pudo crear el proveedor', error);
            this.formError.set('No se pudo crear el proveedor. Intenta nuevamente.');
            this.notificaciones.error('No se pudo crear el proveedor.');
            return EMPTY;
          })
        )
        .subscribe(proveedor => {
          const normalizado = this.normalizarProveedor(proveedor);
          this.proveedores.update(actual => [...actual, normalizado]);
          this.notificaciones.exito(`Proveedor ${normalizado.nombre} registrado.`);
          this.cerrarFormulario();
        });
      return;
    }

    const id = this.selectedProveedorId();
    if (!id) {
      this.formSubmitting.set(false);
      this.formError.set('No se pudo identificar el proveedor a editar.');
      return;
    }

    this.proveedoresService
      .actualizarProveedor(id, payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.formSubmitting.set(false)),
        catchError(error => {
          console.error('No se pudo actualizar el proveedor', error);
          this.formError.set('No se pudo actualizar el proveedor. Intenta nuevamente.');
          this.notificaciones.error('No se pudo actualizar el proveedor.');
          return EMPTY;
        })
      )
      .subscribe(() => {
        this.proveedores.update(actual =>
          actual.map(proveedor =>
            proveedor.id === id
              ? {
                  ...proveedor,
                  nombre: payload.nombre,
                  contacto: payload.contacto ?? null,
                  telefono: payload.telefono ?? null,
                  correo: payload.correo ?? null,
                  direccion: payload.direccion ?? null
                }
              : proveedor
          )
        );
        this.notificaciones.exito(`Proveedor ${payload.nombre} actualizado.`);
        this.cerrarFormulario();
      });
  }

  eliminarProveedor(proveedor: Proveedor): void {
    const confirmado = this.isBrowser
      ? window.confirm(`¿Deseas desactivar al proveedor ${proveedor.nombre}?`)
      : true;
    if (!confirmado) {
      return;
    }

    this.deletingId.set(proveedor.id);

    this.proveedoresService
      .eliminarProveedor(proveedor.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.deletingId.set(null)),
        catchError(error => {
          console.error('No se pudo desactivar el proveedor', error);
          this.notificaciones.error('No se pudo desactivar el proveedor.');
          return EMPTY;
        })
      )
      .subscribe(() => {
        this.proveedores.update(actual =>
          actual.map(item => (item.id === proveedor.id ? { ...item, deleted: true } : item))
        );
        this.notificaciones.info(`Proveedor ${proveedor.nombre} desactivado.`);
      });
  }

  restaurarProveedor(proveedor: Proveedor): void {
    this.restoringId.set(proveedor.id);
    this.proveedoresService
      .restaurarProveedor(proveedor.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.restoringId.set(null)),
        catchError(error => {
          console.error('No se pudo reactivar el proveedor', error);
          this.notificaciones.error('No se pudo reactivar el proveedor.');
          return EMPTY;
        })
      )
      .subscribe(() => {
        this.proveedores.update(actual =>
          actual.map(item => (item.id === proveedor.id ? { ...item, deleted: false } : item))
        );
        this.notificaciones.exito(`Proveedor ${proveedor.nombre} reactivado.`);
      });
  }

  private cargarProveedores(): void {
    this.loading.set(true);
    this.loadError.set(null);

    this.proveedoresService
      .obtenerProveedores()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
        catchError(error => {
          console.error('No se pudieron cargar los proveedores', error);
          this.loadError.set('No se pudo obtener la información de proveedores. Intenta nuevamente.');
          this.notificaciones.error('No se pudo cargar la lista de proveedores.');
          return EMPTY;
        })
      )
      .subscribe(proveedores => {
        this.proveedores.set(proveedores.map(item => this.normalizarProveedor(item)));
        this.notificaciones.info('Proveedores actualizados.');
      });
  }

  private normalizarCampo(valor?: string | null): string | null {
    if (valor === null || valor === undefined) {
      return null;
    }
    const limpio = valor.trim();
    return limpio ? limpio : null;
  }

  private normalizarProveedor(proveedor: Proveedor): Proveedor {
    return {
      ...proveedor,
      contacto: this.normalizarCampo(proveedor.contacto) ?? null,
      telefono: this.normalizarCampo(proveedor.telefono) ?? null,
      correo: this.normalizarCampo(proveedor.correo) ?? null,
      direccion: this.normalizarCampo(proveedor.direccion) ?? null,
      deleted: proveedor.deleted ?? false
    };
  }

}
