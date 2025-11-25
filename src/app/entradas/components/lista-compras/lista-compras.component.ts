import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, finalize } from 'rxjs';
import { ComprasService } from '../../../core/services/compras.service';
import { Compra } from '../../../core/models/compra';
import { NotificacionesService } from '../../../core/services/notificaciones.service';

@Component({
  selector: 'app-lista-compras',
  imports: [CommonModule, RouterLink],
  template: `
<div class="p-8">
  <div class="flex justify-between items-center mb-6">
    <h1 class="text-3xl font-bold text-gray-800">Historial de Compras</h1>
    <a routerLink="/entradas/nueva"
      class="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-blue-700">
      + Registrar Compra
    </a>
  </div>
  <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
    <div class="bg-white border border-gray-100 rounded-lg p-4 shadow-sm">
      <p class="text-sm text-gray-500">Total de compras</p>
      <p class="text-2xl font-semibold text-gray-900">{{ estadisticas().totalCompras }}</p>
      <p class="text-xs text-gray-500">Monto acumulado: {{ estadisticas().montoTotal | currency:'CRC' }}</p>
    </div>
    <div class="bg-white border border-gray-100 rounded-lg p-4 shadow-sm">
      <p class="text-sm text-gray-500">Pendientes</p>
      <p class="text-2xl font-semibold text-amber-600">{{ estadisticas().pendientes }}</p>
      <p class="text-xs text-gray-500">Monto: {{ estadisticas().montoPendiente | currency:'CRC' }}</p>
    </div>
    <div class="bg-white border border-gray-100 rounded-lg p-4 shadow-sm">
      <p class="text-sm text-gray-500">Completadas</p>
      <p class="text-2xl font-semibold text-green-600">{{ estadisticas().completadas }}</p>
      <p class="text-xs text-gray-500">Monto: {{ estadisticas().montoCompletado | currency:'CRC' }}</p>
    </div>
    <div class="bg-white border border-gray-100 rounded-lg p-4 shadow-sm">
      <p class="text-sm text-gray-500">Canceladas</p>
      <p class="text-2xl font-semibold text-red-600">{{ estadisticas().canceladas }}</p>
      <p class="text-xs text-gray-500">Monto: {{ estadisticas().montoCancelado | currency:'CRC' }}</p>
    </div>
  </div>

  <div class="bg-white shadow-md rounded-lg overflow-hidden">
    <div class="px-6 py-4 border-b border-gray-100 bg-gray-50 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 w-full">
        <label class="flex flex-col gap-1 text-sm text-gray-700">
          <span>Buscar</span>
          <input type="search" class="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-gray-200"
            placeholder="Proveedor o código" [value]="filtroProveedor()"
            (input)="actualizarProveedor($any($event.target).value)" />
          </label>

          <label class="flex flex-col gap-1 text-sm text-gray-700">
            <span>Estado</span>
            <select class="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-gray-200"
              [value]="filtroEstado()" (change)="actualizarEstado($any($event.target).value)">
              <option value="todos">Todos</option>
              <option value="Pendiente">Pendiente</option>
              <option value="Completada">Completada</option>
              <option value="Cancelada">Cancelada</option>
            </select>
          </label>

          <label class="flex flex-col gap-1 text-sm text-gray-700">
            <span>Fecha desde</span>
            <input type="date" class="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-gray-200"
              [value]="filtroFechaInicio()"
              (change)="actualizarFechaInicio($any($event.target).value)" />
            </label>

            <label class="flex flex-col gap-1 text-sm text-gray-700">
              <span>Fecha hasta</span>
              <input type="date" class="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-gray-200"
                [value]="filtroFechaFin()"
                (change)="actualizarFechaFin($any($event.target).value)" />
              </label>
            </div>

            <div class="flex flex-col gap-2 md:flex-row md:items-center md:gap-2">
              <button type="button"
                class="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-200"
                (click)="limpiarFiltros()" [disabled]="!filtroProveedor() && filtroEstado() === 'todos' && !filtroFechaInicio() && !filtroFechaFin()">
                Limpiar filtros
              </button>
              <button type="button"
                class="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-gray-800 text-white text-sm font-semibold hover:bg-gray-900 disabled:opacity-50"
                (click)="refrescar()" [disabled]="loading()">
                {{ loading() ? 'Actualizando…' : 'Refrescar' }}
              </button>
              <button type="button"
                class="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
                (click)="exportarCsv()" [disabled]="loading() || exportando()">
                {{ exportando() ? 'Generando…' : 'Exportar CSV' }}
              </button>
            </div>
          </div>

          <div class="px-6 py-2 text-xs text-gray-500 border-b border-gray-100 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <span>Última actualización: {{ ultimaActualizacion() ? (ultimaActualizacion() | date:'dd/MM/yyyy HH:mm') : 'Nunca' }}</span>
            @if (total()) {
              <span class="text-gray-600">{{ total() }} registros totales</span>
            }
          </div>

          @if (loading()) {
            <div class="p-6 text-center text-gray-500">Cargando historial…</div>
          }

          @if (!loading() && error()) {
            <div class="p-6 text-center text-red-600">
              {{ error() }}
            </div>
          }

          @if (!loading() && !error()) {
            @if (total()) {
              <div class="overflow-x-auto">
                <table class="min-w-full">
                  <thead class="bg-gray-100">
                    <tr>
                      <th class="p-4 text-left">Código</th>
                      <th class="p-4 text-left">Proveedor</th>
                      <th class="p-4 text-left">Fecha</th>
                      <th class="p-4 text-center">Estado</th>
                      <th class="p-4 text-right">Monto Total</th>
                      <th class="p-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (compra of comprasFiltradas(); track compra) {
                      <tr class="border-b hover:bg-gray-50">
                        <td class="p-4 text-sm text-gray-600">{{ compra.codigo }}</td>
                        <td class="p-4 font-medium text-gray-800">{{ compra.proveedor }}</td>
                        <td class="p-4 text-gray-600">{{ compra.fecha | date:'dd/MM/yyyy' }}</td>
                        <td class="p-4 text-center">
                                    <span class="px-2 py-1 rounded-full text-xs" [ngClass]="{
                                        'bg-yellow-100 text-yellow-800': compra.estado === 'Pendiente',
                                        'bg-green-100 text-green-800': compra.estado === 'Completada',
                                        'bg-red-100 text-red-800': compra.estado === 'Cancelada'
                                    }">
                            {{ compra.estado }}
                          </span>
                        </td>
                        <td class="p-4 text-right text-gray-800 font-semibold">
                          {{ compra.montoTotal | currency:'CRC' }}
                        </td>
                        <td class="p-4 text-center">
                          <a [routerLink]="['/entradas/detalle', compra.id]"
                            class="text-blue-600 hover:underline text-sm font-semibold">
                            Ver detalle
                          </a>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
              @if (totalFiltradas()) {
                <div class="px-6 py-4 border-t border-gray-100 bg-gray-50 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div class="text-sm text-gray-600">
                    Resultados: {{ totalFiltradas() }} de {{ total() }} registros
                  </div>
                  <div class="text-sm font-semibold text-gray-800">
                    Monto total filtrado: {{ montoTotalFiltrado() | currency:'CRC' }}
                  </div>
                </div>
              }
              @if (!totalFiltradas()) {
                <div class="px-6 py-4 border-t border-gray-100 text-center text-gray-500">
                  No hay compras que coincidan con los filtros aplicados.
                </div>
              }
            } @else {
              <div class="p-6 text-center text-gray-500">
                Aún no se han registrado compras.
              </div>
            }
          }
        </div>
      </div>


  `,
  styles: [`

  `],
})
export class ListaCompras {
  private readonly comprasService = inject(ComprasService);
  private readonly notificaciones = inject(NotificacionesService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly compras = signal<Compra[]>([]);
  readonly total = computed(() => this.compras().length);
  readonly filtroEstado = signal<'todos' | Compra['estado']>('todos');
  readonly filtroProveedor = signal<string>('');
  readonly filtroFechaInicio = signal<string>('');
  readonly filtroFechaFin = signal<string>('');
  readonly ultimaActualizacion = signal<Date | null>(null);
  readonly estadisticas = computed(() => {
    const compras = this.compras();
    const totalCompras = compras.length;
    const montoTotal = compras.reduce((sum, compra) => sum + compra.montoTotal, 0);
    const pendientes = compras.filter(compra => compra.estado === 'Pendiente');
    const completadas = compras.filter(compra => compra.estado === 'Completada');
    const canceladas = compras.filter(compra => compra.estado === 'Cancelada');

    const resumen = {
      totalCompras,
      montoTotal,
      pendientes: pendientes.length,
      montoPendiente: pendientes.reduce((sum, compra) => sum + compra.montoTotal, 0),
      completadas: completadas.length,
      montoCompletado: completadas.reduce((sum, compra) => sum + compra.montoTotal, 0),
      canceladas: canceladas.length,
      montoCancelado: canceladas.reduce((sum, compra) => sum + compra.montoTotal, 0)
    };

    return resumen;
  });
  readonly comprasFiltradas = computed(() => {
    const estado = this.filtroEstado();
    const termino = this.filtroProveedor().trim().toLowerCase();
    const fechaInicio = this.parseFechaFiltro(this.filtroFechaInicio());
    const fechaFin = this.parseFechaFiltro(this.filtroFechaFin(), true);

    return this.compras().filter(compra => {
      if (estado !== 'todos' && compra.estado !== estado) {
        return false;
      }

      if (termino) {
        const proveedor = compra.proveedor?.toLowerCase() ?? '';
        const codigo = compra.codigo?.toLowerCase() ?? '';
        if (!proveedor.includes(termino) && !codigo.includes(termino)) {
          return false;
        }
      }

      if (!fechaInicio && !fechaFin) {
        return true;
      }

      const fechaCompra = this.parseFechaApi(compra.fecha);
      if (!fechaCompra) {
        return false;
      }

      if (fechaInicio && fechaCompra < fechaInicio) {
        return false;
      }
      if (fechaFin && fechaCompra > fechaFin) {
        return false;
      }
      return true;
    });
  });
  readonly totalFiltradas = computed(() => this.comprasFiltradas().length);
  readonly montoTotalFiltrado = computed(() =>
    this.comprasFiltradas().reduce((acumulado, compra) => acumulado + compra.montoTotal, 0)
  );
  readonly exportando = signal<boolean>(false);

  constructor() {
    this.cargarCompras();
  }

  refrescar(): void {
    this.cargarCompras(true);
  }

  exportarCsv(): void {
    const enNavegador = typeof window !== 'undefined' && typeof document !== 'undefined';
    if (!enNavegador) {
      this.notificaciones.error('La exportación solo está disponible en el navegador.');
      return;
    }

    const datos = this.comprasFiltradas();
    if (!datos.length) {
      this.notificaciones.info('No hay compras para exportar con los filtros actuales.');
      return;
    }

    this.exportando.set(true);

    try {
      const encabezados = ['Código', 'Proveedor', 'Fecha', 'Estado', 'Monto total'];
      const filas = datos.map(compra => [
        this.sanitizarCsv(compra.codigo),
        this.sanitizarCsv(compra.proveedor),
        this.formatearFechaCsv(compra.fecha),
        compra.estado,
        compra.montoTotal.toFixed(2)
      ]);
      const contenido = [encabezados, ...filas]
        .map(celdas => celdas.join(';'))
        .join('\r\n');

      const blob = new Blob(['\uFEFF' + contenido], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = `compras-${Date.now()}.csv`;
      enlace.style.display = 'none';
      document.body.appendChild(enlace);
      enlace.click();
      document.body.removeChild(enlace);
      URL.revokeObjectURL(url);
      this.notificaciones.exito('Se exportó el listado de compras.');
    } catch (error) {
      console.error('No se pudo generar el archivo CSV', error);
      this.notificaciones.error('Ocurrió un error al generar el archivo.');
    } finally {
      this.exportando.set(false);
    }
  }

  private cargarCompras(esRefresco = false): void {
    this.loading.set(true);
    this.error.set(null);

    this.comprasService
      .obtenerCompras()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(error => {
          console.error('No se pudieron cargar las compras', error);
          this.error.set('No se pudo obtener el historial de compras. Intenta más tarde.');
          this.notificaciones.error('No se pudo cargar el historial de compras.');
          return EMPTY;
        }),
        finalize(() => this.loading.set(false))
      )
      .subscribe(compras => {
        this.compras.set(compras);
        this.ultimaActualizacion.set(new Date());
        const mensaje = esRefresco ? 'Historial actualizado.' : 'Compras actualizadas.';
        this.notificaciones.info(mensaje);
      });
  }

  actualizarProveedor(valor: string): void {
    this.filtroProveedor.set(valor);
  }

  actualizarEstado(valor: string): void {
    if (valor === 'todos' || valor === 'Pendiente' || valor === 'Completada' || valor === 'Cancelada') {
      this.filtroEstado.set(valor);
    }
  }

  actualizarFechaInicio(valor: string): void {
    this.filtroFechaInicio.set(valor);
  }

  actualizarFechaFin(valor: string): void {
    this.filtroFechaFin.set(valor);
  }

  limpiarFiltros(): void {
    this.filtroEstado.set('todos');
    this.filtroProveedor.set('');
    this.filtroFechaInicio.set('');
    this.filtroFechaFin.set('');
  }

  private parseFechaFiltro(valor: string, finDeDia = false): Date | null {
    if (!valor) {
      return null;
    }
    const partes = valor.split('-').map(Number);
    if (partes.length !== 3 || partes.some(parte => Number.isNaN(parte))) {
      return null;
    }
    const [anio, mes, dia] = partes;
    if (finDeDia) {
      return new Date(anio, mes - 1, dia, 23, 59, 59, 999);
    }
    return new Date(anio, mes - 1, dia, 0, 0, 0, 0);
  }

  private parseFechaApi(valor: string): Date | null {
    if (!valor) {
      return null;
    }
    const fecha = new Date(valor);
    return Number.isNaN(fecha.getTime()) ? null : fecha;
  }

  private formatearFechaCsv(valor: string): string {
    const fecha = this.parseFechaApi(valor);
    if (!fecha) {
      return valor ?? '';
    }
    return fecha.toLocaleDateString('es-CR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private sanitizarCsv(valor?: string): string {
    if (!valor) {
      return '';
    }
    const necesitaComillas = /[";\n]/.test(valor);
    if (!necesitaComillas) {
      return valor;
    }
    return '"' + valor.replace(/"/g, '""') + '"';
  }
}
