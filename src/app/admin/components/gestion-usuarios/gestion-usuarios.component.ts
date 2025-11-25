import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, EMPTY, finalize, forkJoin } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { Usuario } from '../../../core/models/usuario';
import { RolesService } from '../../../core/services/roles.service';
import { Rol } from '../../../core/models/usuario';
import { NotificacionesService } from '../../../core/services/notificaciones.service';

@Component({
  selector: 'app-gestion-usuarios',
  imports: [CommonModule, ReactiveFormsModule],
  template: `
<div class="p-8">
  <h1 class="text-3xl font-bold mb-6 text-gray-800">Gestión de Usuarios</h1>

  <div class="mb-6 flex justify-end">
    <button type="button"
      class="bg-gray-800 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-900 transition"
      (click)="abrirFormularioCrear()">
      Nuevo usuario
    </button>
  </div>

  <div class="flex flex-wrap items-center justify-between gap-3 mb-6">
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
    </div>

    <div class="flex flex-col gap-2 w-full sm:w-auto sm:flex-row sm:items-center sm:gap-3">
      <div class="relative w-full sm:w-72">
        <input type="search"
          class="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring focus:ring-gray-200"
          placeholder="Buscar por nombre o usuario"
          [value]="searchTerm()"
          (input)="actualizarBusqueda($any($event.target).value)" />
          @if (searchTerm()) {
            <button type="button"
              class="absolute inset-y-0 right-2 flex items-center text-sm text-gray-500 hover:text-gray-700"
              (click)="actualizarBusqueda('')">
              Limpiar
            </button>
          }
        </div>

        <label class="flex items-center gap-2 text-sm text-gray-700">
          Página de
          <select class="border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring focus:ring-gray-200"
            [value]="pageSize()"
            (change)="actualizarTamanoPagina($any($event.target).value)">
            @for (size of pageSizeOptions; track size) {
              <option [value]="size">{{ size }}</option>
            }
          </select>
          filas
        </label>

        <label class="flex items-center gap-2 text-sm text-gray-700">
          Rol
          <select class="border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring focus:ring-gray-200"
            [value]="rolFiltro()"
            (change)="actualizarRolFiltro($any($event.target).value)">
            <option value="todos">Todos los roles</option>
            @for (rol of roles(); track rol) {
              <option [value]="rol.id">{{ rol.nombre }}</option>
            }
          </select>
        </label>
      </div>
    </div>

    @if (formVisible()) {
      <div class="mb-8 bg-white shadow-md rounded-lg border border-gray-100">
        <div class="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 class="text-xl font-semibold text-gray-800">{{ formTitle() }}</h2>
          <button type="button" class="text-sm text-gray-500 hover:text-gray-800" (click)="cerrarFormulario()">
            Cancelar
          </button>
        </div>
        <form class="px-6 py-6 space-y-4" [formGroup]="form" (ngSubmit)="enviarFormulario()">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label class="flex flex-col gap-1">
              <span class="text-sm font-medium text-gray-700">Nombre completo</span>
              <input type="text" formControlName="nombreCompleto"
                class="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-gray-200"
                placeholder="Ej: Ana Pérez" />
                @if (form.get('nombreCompleto')?.touched && form.get('nombreCompleto')?.invalid) {
                  <span class="text-xs text-red-600"
                    >
                    Este campo es obligatorio.
                  </span>
                }
              </label>
              <label class="flex flex-col gap-1">
                <span class="text-sm font-medium text-gray-700">Nombre de usuario</span>
                <input type="text" formControlName="nombreUsuario"
                  class="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-gray-200"
                  placeholder="Ej: aperez" />
                  @if (form.get('nombreUsuario')?.touched && form.get('nombreUsuario')?.invalid) {
                    <span class="text-xs text-red-600"
                      >
                      Este campo es obligatorio.
                    </span>
                  }
                </label>
                <label class="flex flex-col gap-1">
                  <span class="text-sm font-medium text-gray-700">Contraseña</span>
                  <input type="password" formControlName="contrasena"
                    class="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-gray-200"
                    [placeholder]="isEditMode() ? 'Deja en blanco para mantener la actual' : '********'" />
                    @if (isEditMode()) {
                      <span class="text-xs text-gray-500">
                        Deja en blanco para mantener la contraseña actual.
                      </span>
                    }
                  </label>
                  <label class="flex flex-col gap-1">
                    <span class="text-sm font-medium text-gray-700">Salario</span>
                    <input type="number" formControlName="salario" min="0" step="0.01"
                      class="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-gray-200" />
                      @if (form.get('salario')?.touched && form.get('salario')?.invalid) {
                        <span class="text-xs text-red-600"
                          >
                          Indica un salario válido.
                        </span>
                      }
                    </label>
                    <label class="flex flex-col gap-1 md:col-span-2">
                      <span class="text-sm font-medium text-gray-700">Rol</span>
                      <select formControlName="idRol"
                        class="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-gray-200">
                        <option value="" disabled>Selecciona un rol</option>
                        @for (rol of roles(); track rol) {
                          <option [value]="rol.id">{{ rol.nombre }}</option>
                        }
                      </select>
                      @if (form.get('idRol')?.touched && form.get('idRol')?.invalid) {
                        <span class="text-xs text-red-600"
                          >
                          Selecciona un rol.
                        </span>
                      }
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
                      {{ formSubmitting() ? 'Guardando…' : (isEditMode() ? 'Guardar cambios' : 'Crear usuario') }}
                    </button>
                  </div>
                </form>
              </div>
            }

            <div class="bg-white shadow-md rounded-lg overflow-hidden">
              @if (loading()) {
                <div class="p-6 text-center text-gray-500">Cargando información...</div>
              }

              @if (!loading() && loadError()) {
                <div class="p-6 text-center text-red-600">
                  {{ loadError() }}
                </div>
              }

              @if (!loading() && !loadError()) {
                @if (hasUsuarios()) {
                  <div class="overflow-x-auto">
                    <table class="min-w-full">
                      <thead class="bg-gray-100">
                        <tr>
                          <th class="p-4 text-left">Nombre Completo</th>
                          <th class="p-4 text-left">Usuario</th>
                          <th class="p-4 text-left">Rol</th>
                          <th class="p-4 text-center">Salario</th>
                          <th class="p-4 text-center">Estado</th>
                          <th class="p-4 text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (usuario of usuariosPaginados(); track usuario) {
                          <tr class="border-b hover:bg-gray-50">
                            <td class="p-4 font-medium text-gray-800">{{ usuario.nombreCompleto }}</td>
                            <td class="p-4 text-gray-600">{{ usuario.nombreUsuario }}</td>
                            <td class="p-4 text-gray-600">{{ getRoleName(usuario.idRol) }}</td>
                            <td class="p-4 text-center text-gray-600">{{ usuario.salario | currency:'CRC' }}</td>
                            <td class="p-4 text-center">
                              <span
                                class="px-2 py-1 rounded-full text-xs"
                                [class.bg-green-200]="!usuario.deleted"
                                [class.text-green-800]="!usuario.deleted"
                                [class.bg-red-200]="usuario.deleted"
                                [class.text-red-800]="usuario.deleted">
                                {{ usuario.deleted ? 'Inactivo' : 'Activo' }}
                              </span>
                            </td>
                            <td class="p-4 text-center">
                              <div class="flex items-center justify-center gap-3">
                                @if (!usuario.deleted) {
                                  <button type="button"
                                    class="text-blue-600 hover:underline"
                                    (click)="abrirFormularioEditar(usuario)">
                                    Editar
                                  </button>
                                }
                                @if (!usuario.deleted) {
                                  <button type="button"
                                    class="text-red-600 hover:underline disabled:text-gray-400 disabled:cursor-not-allowed"
                                    [disabled]="deletingId() === usuario.id"
                                    (click)="eliminarUsuario(usuario)">
                                    {{ deletingId() === usuario.id ? 'Eliminando…' : 'Eliminar' }}
                                  </button>
                                }
                                @if (usuario.deleted) {
                                  <button type="button"
                                    class="text-green-600 hover:underline disabled:text-gray-400 disabled:cursor-not-allowed"
                                    [disabled]="reactivatingId() === usuario.id"
                                    (click)="reactivarUsuario(usuario)">
                                    {{ reactivatingId() === usuario.id ? 'Reactivando…' : 'Reactivar' }}
                                  </button>
                                }
                              </div>
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                  <div class="px-6 py-4 flex flex-col gap-3 border-t border-gray-100 sm:flex-row sm:items-center sm:justify-between">
                    <div class="text-sm text-gray-600">
                      @if (totalFiltrados()) {
                        Mostrando {{ rangoInicio() }} - {{ rangoFin() }} de {{ totalFiltrados() }} usuarios
                      } @else {
                        Sin resultados para los filtros actuales
                      }
                    </div>
                    <div class="flex items-center gap-2">
                      <button type="button"
                        class="px-3 py-1 rounded border border-gray-300 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-white"
                        [disabled]="!puedeRetroceder()"
                        (click)="paginaAnterior()">
                        Anterior
                      </button>
                      <span class="text-sm text-gray-600">
                        Página {{ totalFiltrados() ? pageIndex() + 1 : 0 }} de {{ totalPaginas() }}
                      </span>
                      <button type="button"
                        class="px-3 py-1 rounded border border-gray-300 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-white"
                        [disabled]="!puedeAvanzar()"
                        (click)="paginaSiguiente()">
                        Siguiente
                      </button>
                    </div>
                  </div>
                } @else {
                  <div class="p-6 text-center text-gray-500">
                    {{ estadoFiltro() === 'activos' ? 'No hay usuarios activos registrados.' : 'No hay usuarios inactivos registrados.' }}
                  </div>
                }
              }
            </div>

          </div>
  `,
  styles: [`

  `],
})
export class GestionUsuarios {
  private readonly usuariosService = inject(UsuariosService);
  private readonly rolesService = inject(RolesService);
  private readonly fb = inject(FormBuilder);
  private readonly notificaciones = inject(NotificacionesService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = typeof window !== 'undefined';

  readonly usuarios = signal<Usuario[]>([]);
  readonly roles = signal<Rol[]>([]);
  readonly loading = signal<boolean>(true);
  readonly loadError = signal<string | null>(null);
  readonly estadoFiltro = signal<'activos' | 'inactivos'>('activos');
  readonly searchTerm = signal<string>('');
  readonly rolFiltro = signal<number | 'todos'>('todos');
  readonly pageSizeOptions = [5, 10, 20];
  readonly pageSize = signal<number>(10);
  readonly pageIndex = signal<number>(0);
  readonly usuariosFiltrados = computed(() =>
    this.usuarios().filter(usuario => {
      const coincideEstado = this.estadoFiltro() === 'activos' ? !usuario.deleted : usuario.deleted;
      if (!coincideEstado) {
        return false;
      }

      if (this.rolFiltro() !== 'todos' && usuario.idRol !== this.rolFiltro()) {
        return false;
      }

      const termino = this.searchTerm().trim().toLowerCase();
      if (!termino) {
        return true;
      }

      const nombre = usuario.nombreCompleto?.toLowerCase() ?? '';
      const nombreUsuario = usuario.nombreUsuario?.toLowerCase() ?? '';
      return nombre.includes(termino) || nombreUsuario.includes(termino);
    })
  );
  readonly totalFiltrados = computed(() => this.usuariosFiltrados().length);
  readonly totalPaginas = computed(() => Math.max(Math.ceil(this.totalFiltrados() / this.pageSize()), 1));
  readonly usuariosPaginados = computed(() => {
    if (!this.totalFiltrados()) {
      return [] as Usuario[];
    }
    const start = this.pageIndex() * this.pageSize();
    return this.usuariosFiltrados().slice(start, start + this.pageSize());
  });
  readonly hasUsuarios = computed(() => this.totalFiltrados() > 0);
  readonly rangoInicio = computed(() =>
    this.totalFiltrados() === 0 ? 0 : this.pageIndex() * this.pageSize() + 1
  );
  readonly rangoFin = computed(() =>
    this.totalFiltrados() === 0
      ? 0
      : Math.min(this.pageIndex() * this.pageSize() + this.pageSize(), this.totalFiltrados())
  );
  readonly puedeRetroceder = computed(() => this.pageIndex() > 0);
  readonly puedeAvanzar = computed(() => this.pageIndex() < this.totalPaginas() - 1);
  readonly rolesMap = computed(() => {
    const map = new Map<number, string>();
    for (const rol of this.roles()) {
      map.set(rol.id, rol.nombre);
    }
    return map;
  });
  readonly deletingId = signal<number | null>(null);
  readonly reactivatingId = signal<number | null>(null);
  readonly formVisible = signal<boolean>(false);
  readonly formMode = signal<'create' | 'edit'>('create');
  readonly formSubmitting = signal<boolean>(false);
  readonly formError = signal<string | null>(null);
  readonly selectedUsuarioId = signal<number | null>(null);
  readonly formTitle = computed(() =>
    this.formMode() === 'create' ? 'Registrar usuario' : 'Editar usuario'
  );
  readonly isEditMode = computed(() => this.formMode() === 'edit');

  readonly form = this.fb.group({
    nombreCompleto: this.fb.control<string>('', { nonNullable: true, validators: [Validators.required] }),
    nombreUsuario: this.fb.control<string>('', { nonNullable: true, validators: [Validators.required] }),
    contrasena: this.fb.control<string>('', []),
    salario: this.fb.control<number | null>(null, {
      validators: [Validators.required, Validators.min(0)]
    }),
    idRol: this.fb.control<number | null>(null, { validators: [Validators.required] })
  });

  constructor() {
    this.cargarDatos();

    effect(() => {
      const total = this.totalFiltrados();
      const size = this.pageSize();
      const maxIndex = Math.max(Math.ceil(total / size) - 1, 0);
      const current = this.pageIndex();
      if (current > maxIndex) {
        this.pageIndex.set(maxIndex);
      }
    });
  }

  getRoleName(idRol: number): string {
    return this.rolesMap().get(idRol) ?? `Rol #${idRol}`;
  }

  cambiarFiltro(filtro: 'activos' | 'inactivos'): void {
    if (this.estadoFiltro() === filtro) {
      return;
    }
    this.estadoFiltro.set(filtro);
    this.pageIndex.set(0);
  }

  actualizarBusqueda(valor: string): void {
    this.searchTerm.set(valor);
    this.pageIndex.set(0);
  }

  actualizarRolFiltro(valor: string | number): void {
    if (valor === 'todos') {
      this.rolFiltro.set('todos');
      this.pageIndex.set(0);
      return;
    }

    const parsed = Number(valor);
    if (!Number.isFinite(parsed)) {
      return;
    }
    this.rolFiltro.set(parsed);
    this.pageIndex.set(0);
  }

  paginaAnterior(): void {
    if (!this.puedeRetroceder()) {
      return;
    }
    this.pageIndex.update(index => Math.max(index - 1, 0));
  }

  paginaSiguiente(): void {
    if (!this.puedeAvanzar()) {
      return;
    }
    this.pageIndex.update(index => Math.min(index + 1, this.totalPaginas() - 1));
  }

  irAPagina(index: number): void {
    if (index < 0 || index >= this.totalPaginas()) {
      return;
    }
    this.pageIndex.set(index);
  }

  actualizarTamanoPagina(valor: string | number): void {
    const parsed = Number(valor);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return;
    }
    this.pageSize.set(parsed);
    this.pageIndex.set(0);
  }

  private cargarDatos(): void {
    this.loading.set(true);
    this.loadError.set(null);

    forkJoin({
      usuarios: this.usuariosService.getUsuarios(),
      roles: this.rolesService.getRoles()
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(error => {
          console.error('No se pudo obtener los datos de usuarios', error);
          this.loadError.set('No se pudo obtener los datos. Intenta nuevamente.');
          this.notificaciones.error('No se pudo cargar la información de usuarios.');
          return EMPTY;
        }),
        finalize(() => this.loading.set(false))
      )
      .subscribe(({ usuarios, roles }) => {
        this.usuarios.set(usuarios);
        this.roles.set(roles);
        this.notificaciones.info('Datos de usuarios actualizados.');
      });
  }

  eliminarUsuario(usuario: Usuario): void {
    const confirmado = this.isBrowser ? window.confirm(`¿Deseas eliminar a ${usuario.nombreCompleto}?`) : true;
    if (!confirmado) {
      return;
    }

    this.deletingId.set(usuario.id);
    this.usuariosService
      .deleteUsuario(usuario.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.deletingId.set(null)),
        catchError(error => {
          console.error('No se pudo eliminar el usuario', error);
          this.loadError.set('No se pudo eliminar el usuario. Intenta nuevamente.');
          this.notificaciones.error('No se pudo eliminar el usuario.');
          return EMPTY;
        })
      )
      .subscribe(() => {
        this.usuarios.update(items =>
          items.map(item => (item.id === usuario.id ? { ...item, deleted: true } : item))
        );
        this.notificaciones.exito(`Usuario ${usuario.nombreCompleto} desactivado.`);
      });
  }

  reactivarUsuario(usuario: Usuario): void {
    this.reactivatingId.set(usuario.id);
    this.usuariosService
      .reactivateUsuario(usuario.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.reactivatingId.set(null)),
        catchError(error => {
          console.error('No se pudo reactivar el usuario', error);
          this.loadError.set('No se pudo reactivar el usuario. Intenta nuevamente.');
          this.notificaciones.error('No se pudo reactivar el usuario.');
          return EMPTY;
        })
      )
      .subscribe(() => {
        this.usuarios.update(items =>
          items.map(item => (item.id === usuario.id ? { ...item, deleted: false } : item))
        );
        this.notificaciones.exito(`Usuario ${usuario.nombreCompleto} reactivado.`);
      });
  }

  abrirFormularioCrear(): void {
    this.formMode.set('create');
    this.selectedUsuarioId.set(null);
    this.form.reset({
      nombreCompleto: '',
      nombreUsuario: '',
      contrasena: '',
      salario: null,
      idRol: null
    });
    this.formError.set(null);
    this.formVisible.set(true);
  }

  abrirFormularioEditar(usuario: Usuario): void {
    this.formMode.set('edit');
    this.selectedUsuarioId.set(usuario.id);
    this.form.reset({
      nombreCompleto: usuario.nombreCompleto,
      nombreUsuario: usuario.nombreUsuario,
      contrasena: '',
      salario: usuario.salario,
      idRol: usuario.idRol
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

    const { nombreCompleto, nombreUsuario, contrasena, salario, idRol } = this.form.getRawValue();
    if (salario === null || idRol === null) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = {
      nombreCompleto: nombreCompleto.trim(),
      nombreUsuario: nombreUsuario.trim(),
      salario,
      idRol,
      contrasena: contrasena?.trim()
    };

    if (!payload.nombreCompleto || !payload.nombreUsuario) {
      this.formError.set('Por favor completa los campos requeridos.');
      return;
    }

    this.formSubmitting.set(true);
    this.formError.set(null);

    if (this.formMode() === 'create') {
      if (!payload.contrasena) {
        this.formSubmitting.set(false);
        this.formError.set('Debes asignar una contraseña para el nuevo usuario.');
        return;
      }

      this.usuariosService
        .createUsuario(payload)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          finalize(() => this.formSubmitting.set(false)),
          catchError(error => {
            console.error('No se pudo crear el usuario', error);
            this.formError.set('No se pudo crear el usuario. Intenta nuevamente.');
            this.notificaciones.error('No se pudo crear el usuario.');
            return EMPTY;
          })
        )
        .subscribe(usuarioCreado => {
          const normalizado: Usuario = {
            ...usuarioCreado,
            deleted: usuarioCreado.deleted ?? false
          };
          this.usuarios.update(items => [...items, normalizado]);
          this.cerrarFormulario();
          this.notificaciones.exito(`Usuario ${usuarioCreado.nombreCompleto} creado.`);
        });
      return;
    }

    const id = this.selectedUsuarioId();
    if (!id) {
      this.formSubmitting.set(false);
      this.formError.set('No se pudo identificar el usuario a editar.');
      return;
    }

    const updatePayload = { ...payload };
    if (!updatePayload.contrasena) {
      delete updatePayload.contrasena;
    }

    this.usuariosService
      .updateUsuario(id, updatePayload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.formSubmitting.set(false)),
        catchError(error => {
          console.error('No se pudo actualizar el usuario', error);
          this.formError.set('No se pudo actualizar el usuario. Intenta nuevamente.');
          this.notificaciones.error('No se pudo actualizar el usuario.');
          return EMPTY;
        })
      )
      .subscribe(() => {
        this.usuarios.update(items =>
          items.map(item =>
            item.id === id
              ? {
                  ...item,
                  nombreCompleto: payload.nombreCompleto,
                  nombreUsuario: payload.nombreUsuario,
                  salario: payload.salario,
                  idRol: payload.idRol
                }
              : item
          )
        );
        this.cerrarFormulario();
        this.notificaciones.exito(`${payload.nombreCompleto} actualizado.`);
      });
  }
}
