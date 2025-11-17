import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
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
  templateUrl: './registrar-compra.html',
  styleUrl: './registrar-compra.css'
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

  trackByDetalle(index: number): number {
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
