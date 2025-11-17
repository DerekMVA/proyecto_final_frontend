import { CommonModule } from '@angular/common';
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
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './gestion-proveedores.html',
  styleUrl: './gestion-proveedores.css'
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
