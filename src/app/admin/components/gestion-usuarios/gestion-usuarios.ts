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
  templateUrl: './gestion-usuarios.html',
  styleUrl: './gestion-usuarios.css'
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
