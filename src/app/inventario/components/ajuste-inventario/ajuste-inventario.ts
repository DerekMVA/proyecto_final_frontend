import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, finalize } from 'rxjs';
import { InventarioService } from '../../../core/services/inventario.service';
import { AjusteInventarioPayload, InventarioItem } from '../../../core/models/inventario';
import { NotificacionesService } from '../../../core/services/notificaciones.service';

@Component({
  selector: 'app-ajuste-inventario',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './ajuste-inventario.html',
  styleUrl: './ajuste-inventario.css'
})
export class AjusteInventario {
  private readonly fb = inject(FormBuilder);
  private readonly inventarioService = inject(InventarioService);
  private readonly notificaciones = inject(NotificacionesService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly inventario = signal<InventarioItem[]>([]);
  readonly inventarioCargando = signal<boolean>(true);
  readonly inventarioError = signal<string | null>(null);
  readonly termino = signal<string>('');
  readonly submitError = signal<string | null>(null);
  readonly enviando = signal<boolean>(false);

  readonly form = this.fb.group({
    idProducto: this.fb.control<number | null>(null, { validators: [Validators.required] }),
    nuevaCantidad: this.fb.control<number | null>(null, {
      validators: [Validators.required, Validators.min(0)]
    }),
    motivo: this.fb.control<string>('', {
      validators: [Validators.required, Validators.maxLength(200)]
    }),
    observaciones: this.fb.control<string>('', {
      validators: [Validators.maxLength(500)]
    })
  });

  private readonly formValores = signal(this.form.getRawValue());

  readonly coincidencias = computed(() => {
    const termino = this.termino().trim().toLowerCase();
    if (!termino) {
      return [];
    }
    return this.inventario()
      .filter(item => {
        return (
          item.nombre.toLowerCase().includes(termino) ||
          item.codigo.toLowerCase().includes(termino) ||
          item.categoria.toLowerCase().includes(termino)
        );
      })
      .slice(0, 5);
  });

  readonly productoSeleccionado = computed(() => {
    const id = this.formValores().idProducto;
    if (id == null) {
      return null;
    }
    return this.inventario().find(item => item.id === id) ?? null;
  });

  readonly resumen = computed(() => {
    const producto = this.productoSeleccionado();
    if (!producto) {
      return null;
    }
    const nuevo = Number(this.formValores().nuevaCantidad ?? producto.stockActual);
    const diferencia = nuevo - producto.stockActual;
    return {
      diferencia,
      esIncremento: diferencia >= 0,
      stockActual: producto.stockActual,
      nuevo
    };
  });

  constructor() {
    this.cargarInventario();
    this.actualizarFormValores();
    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.actualizarFormValores());
    this.form
      .get('idProducto')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(id => {
        if (id == null) {
          return;
        }
        const producto = this.inventario().find(item => item.id === id);
        if (producto) {
          this.form.patchValue({ nuevaCantidad: producto.stockActual }, { emitEvent: false });
          this.actualizarFormValores();
        }
      });
  }

  buscar(valor: string): void {
    this.termino.set(valor);
  }

  seleccionarProducto(producto: InventarioItem): void {
    this.form.patchValue({
      idProducto: producto.id,
      nuevaCantidad: producto.stockActual
    }, { emitEvent: false });
    this.actualizarFormValores();
    this.termino.set(`${producto.nombre} (${producto.codigo})`);
  }

  refrescarInventario(): void {
    this.cargarInventario(true);
  }

  irAInventario(): void {
    this.router.navigate(['/inventario']);
  }

  enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notificaciones.error('Revisa los campos del ajuste.');
      return;
    }

    const valores = this.formValores();
    const producto = this.productoSeleccionado();
    const nuevaCantidad = Number(valores.nuevaCantidad);
    const motivo = this.normalizar(valores.motivo);
    const observaciones = this.normalizar(valores.observaciones);

    if (!producto || Number.isNaN(nuevaCantidad) || nuevaCantidad < 0 || motivo == null) {
      this.notificaciones.error('Selecciona un producto y un motivo válido.');
      return;
    }

    const payload: AjusteInventarioPayload = {
      idProducto: producto.id,
      cantidadAnterior: producto.stockActual,
      cantidadNueva: nuevaCantidad,
      motivo,
      observaciones
    };

    this.enviando.set(true);
    this.submitError.set(null);

    this.inventarioService
      .registrarAjuste(payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.enviando.set(false)),
        catchError(error => {
          console.error('No se pudo registrar el ajuste', error);
          this.submitError.set('No se pudo registrar el ajuste. Intenta nuevamente.');
          this.notificaciones.error('No se pudo registrar el ajuste.');
          return EMPTY;
        })
      )
      .subscribe(actualizado => {
        this.notificaciones.exito('Ajuste registrado correctamente.');
        this.inventario.update(lista =>
          lista.map(item => (item.id === actualizado.id ? actualizado : item))
        );
        this.form.reset();
        this.actualizarFormValores();
        this.termino.set('');
      });
  }

  trackById = (_: number, item: InventarioItem): number => item.id;

  private cargarInventario(esRefresco = false): void {
    this.inventarioCargando.set(true);
    this.inventarioError.set(null);

    this.inventarioService
      .obtenerInventario()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.inventarioCargando.set(false)),
        catchError(error => {
          console.error('No se pudo cargar el inventario', error);
          this.inventarioError.set('No se pudo cargar el inventario. Intenta nuevamente.');
          this.notificaciones.error('No se pudo cargar el inventario.');
          return EMPTY;
        })
      )
      .subscribe(inventario => {
        this.inventario.set(inventario);
        if (esRefresco) {
          this.notificaciones.info('Inventario actualizado.');
        }
      });
  }

  private normalizar(valor?: string | null): string | null {
    if (!valor) {
      return null;
    }
    const limpio = valor.trim();
    return limpio ? limpio : null;
  }

  private actualizarFormValores(): void {
    this.formValores.set(this.form.getRawValue());
  }

}
