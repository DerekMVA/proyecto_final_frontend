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
  template: `
<div class="p-8 space-y-6">
  <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
    <div>
      <a routerLink="/inventario" class="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800">
        <span aria-hidden="true">←</span>
        Inventario general
      </a>
      <h1 class="text-3xl font-bold text-gray-800 mt-2">Registrar ajuste de inventario</h1>
      <p class="text-gray-500">Actualiza existencias frente a conteos físicos o incidencias.</p>
    </div>
    <button type="button"
      class="px-4 py-2 rounded-md border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      (click)="refrescarInventario()"
      [disabled]="inventarioCargando()">
      {{ inventarioCargando() ? 'Sincronizando…' : 'Refrescar inventario' }}
    </button>
  </div>

  @if (inventarioCargando()) {
    <div class="bg-white rounded-lg shadow p-6 animate-pulse space-y-4">
      <div class="h-5 bg-slate-200 rounded w-1/3"></div>
      <div class="h-4 bg-slate-200 rounded"></div>
      <div class="h-4 bg-slate-200 rounded w-2/3"></div>
      <div class="h-4 bg-slate-200 rounded"></div>
    </div>
  }

  @if (inventarioError()) {
    <div class="bg-red-50 border border-red-200 text-red-800 rounded-lg p-6">
      <p class="font-semibold mb-3">{{ inventarioError() }}</p>
      <button type="button"
        class="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-semibold hover:bg-red-700"
        (click)="refrescarInventario()">
        Reintentar
      </button>
    </div>
  }

  @if (!inventarioCargando() && !inventarioError()) {
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <form class="bg-white rounded-lg shadow p-6 space-y-5 lg:col-span-2" [formGroup]="form" (ngSubmit)="enviar()">
        <div>
          <label class="block font-semibold text-gray-700 mb-1">Buscar producto</label>
          <div class="relative">
            <input type="search"
              class="w-full border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nombre, código o categoría"
              [value]="termino()"
              (input)="buscar($any($event.target).value)"
              autocomplete="off">
              @if (coincidencias().length) {
                <ul class="absolute z-10 bg-white border border-gray-200 rounded-md shadow-md mt-1 w-full max-h-60 overflow-y-auto">
                  @for (item of coincidencias(); track trackById($index, item)) {
                    <li>
                      <button type="button" class="w-full text-left px-4 py-2 hover:bg-gray-50" (click)="seleccionarProducto(item)">
                        <p class="font-medium text-gray-900">{{ item.nombre }}</p>
                        <p class="text-xs text-gray-500">{{ item.codigo }} · {{ item.categoria }}</p>
                      </button>
                    </li>
                  }
                </ul>
              }
            </div>
          </div>
          <div>
            <label class="block font-semibold text-gray-700 mb-1">Producto seleccionado</label>
            @if (productoSeleccionado()) {
              <div class="border rounded-md p-4 bg-gray-50">
                <p class="text-lg font-semibold text-gray-900">{{ productoSeleccionado()?.nombre }}</p>
                <p class="text-sm text-gray-500">Código {{ productoSeleccionado()?.codigo }}</p>
                <a class="text-sm text-blue-600 hover:text-blue-800 font-medium" [routerLink]="['/inventario/detalle', productoSeleccionado()?.id]">
                  Ver detalle completo
                </a>
              </div>
            } @else {
              <div class="border-dashed border-2 border-gray-200 rounded-md p-4 text-sm text-gray-500">
                Selecciona un producto para continuar.
              </div>
            }
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block font-semibold text-gray-700 mb-1">Nueva cantidad</label>
              <input type="number" formControlName="nuevaCantidad" min="0"
                class="w-full border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              </div>
              <div>
                <label class="block font-semibold text-gray-700 mb-1">Motivo del ajuste</label>
                <input type="text" formControlName="motivo"
                  class="w-full border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Conteo físico, daño, etc.">
                </div>
              </div>
              <div>
                <label class="block font-semibold text-gray-700 mb-1">Observaciones</label>
                <textarea rows="4" formControlName="observaciones"
                  class="w-full border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Añade contexto para el registro"></textarea>
              </div>
              @if (submitError()) {
                <div class="text-red-600 text-sm">{{ submitError() }}</div>
              }
              <div class="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
                <button type="submit"
                  class="w-full md:w-auto px-6 py-3 rounded-md bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
                  [disabled]="enviando()">
                  {{ enviando() ? 'Guardando…' : 'Guardar ajuste' }}
                </button>
                <button type="button"
                  class="w-full md:w-auto px-6 py-3 rounded-md border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50"
                  (click)="irAInventario()">
                  Cancelar
                </button>
              </div>
            </form>
            <section class="bg-white rounded-lg shadow p-6 space-y-4">
              <h2 class="text-lg font-semibold text-gray-800">Resumen del ajuste</h2>
              @if (resumen()) {
                <div class="space-y-3">
                  <div class="flex justify-between text-sm text-gray-600">
                    <span>Stock actual</span>
                    <span class="font-semibold text-gray-900">{{ resumen()?.stockActual }} uds</span>
                  </div>
                  <div class="flex justify-between text-sm text-gray-600">
                    <span>Nueva cantidad</span>
                    <span class="font-semibold text-gray-900">{{ resumen()?.nuevo }} uds</span>
                  </div>
                  <div class="flex justify-between text-sm" [ngClass]="resumen()?.esIncremento ? 'text-green-600' : 'text-red-600'">
                    <span>Diferencia</span>
                    <span class="font-semibold">{{ resumen()?.esIncremento ? '+' : '' }}{{ resumen()?.diferencia }} uds</span>
                  </div>
                </div>
              } @else {
                <p class="text-sm text-gray-500">Selecciona un producto para ver el impacto del ajuste.</p>
              }
            </section>
          </div>
        }
      </div>
  `,
  styles: [`

  `],
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
