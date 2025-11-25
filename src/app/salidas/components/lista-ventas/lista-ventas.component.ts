import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, finalize } from 'rxjs';
import { VentasService } from '../../../core/services/ventas.service';
import { Venta } from '../../../core/models/venta';
import { NotificacionesService } from '../../../core/services/notificaciones.service';

@Component({
  selector: 'app-lista-ventas',
  imports: [CommonModule, RouterLink],
  template: `
<div class="p-8 space-y-6">
  <header class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
    <div>
      <h1 class="text-3xl font-bold text-gray-900">Historial de ventas</h1>
      <p class="text-gray-500">Consulta el desempeño comercial y exporta la información que necesitas.</p>
    </div>
    <div class="flex flex-wrap gap-3">
      <a routerLink="/salidas/clientes"
        class="px-4 py-2 rounded-md border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50">
        Registro de clientes
      </a>
      <a routerLink="/salidas/nueva"
        class="px-4 py-2 rounded-md bg-blue-600 text-white font-semibold shadow hover:bg-blue-700">
        + Registrar venta
      </a>
    </div>
  </header>

  <section class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
    <article class="bg-white rounded-lg shadow p-4">
      <p class="text-sm text-gray-500">Ventas registradas</p>
      <p class="text-3xl font-bold text-gray-900">{{ estadisticas().total }}</p>
      <p class="text-sm text-gray-400">Actualizado {{ ultimaActualizacion()?.toLocaleTimeString() ?? '—' }}</p>
    </article>
    <article class="bg-white rounded-lg shadow p-4">
      <p class="text-sm text-gray-500">Monto total</p>
      <p class="text-3xl font-bold text-gray-900">{{ estadisticas().montoTotal | currency:'CRC':'symbol' }}</p>
      <p class="text-sm text-emerald-600">{{ estadisticas().pagadas }} ventas liquidadas</p>
    </article>
    <article class="bg-white rounded-lg shadow p-4">
      <p class="text-sm text-gray-500">Pendientes</p>
      <p class="text-3xl font-bold text-amber-600">{{ estadisticas().pendientes }}</p>
      <p class="text-sm text-amber-600">{{ estadisticas().montoPendiente | currency:'CRC':'symbol' }} por cobrar</p>
    </article>
    <article class="bg-white rounded-lg shadow p-4">
      <p class="text-sm text-gray-500">Anuladas</p>
      <p class="text-3xl font-bold text-rose-600">{{ estadisticas().anuladas }}</p>
      <p class="text-sm text-rose-600">{{ estadisticas().montoAnulado | currency:'CRC':'symbol' }} descartados</p>
    </article>
  </section>

  <section class="bg-white rounded-lg shadow p-6 space-y-4">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h2 class="text-lg font-semibold text-gray-900">Filtros</h2>
        <p class="text-sm text-gray-500">Refina la tabla por cliente, estado, fechas o montos.</p>
      </div>
      <div class="flex flex-wrap gap-3">
        <button type="button"
          class="px-4 py-2 rounded-md border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50"
          (click)="limpiarFiltros()">
          Limpiar filtros
        </button>
        <button type="button"
          class="px-4 py-2 rounded-md border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 disabled:opacity-50"
          (click)="refrescar()"
          [disabled]="loading()">
          {{ loading() ? 'Actualizando…' : 'Refrescar' }}
        </button>
        <button type="button"
          class="px-4 py-2 rounded-md bg-green-600 text-white font-semibold hover:bg-green-700 disabled:opacity-50"
          (click)="exportarCsv()"
          [disabled]="exportando()">
          {{ exportando() ? 'Generando…' : 'Exportar CSV' }}
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Cliente o factura</label>
        <input type="search"
          class="w-full border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Nombre, cédula o código"
          [value]="filtroCliente()"
          (input)="actualizarCliente($any($event.target).value)">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Estado</label>
          <select class="w-full border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            [value]="filtroEstado()"
            (change)="actualizarEstado($any($event.target).value)">
            <option value="todos">Todos</option>
            <option value="Pagada">Pagada</option>
            <option value="Pendiente">Pendiente</option>
            <option value="Anulada">Anulada</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Fecha inicio</label>
          <input type="date" class="w-full border rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500"
            [value]="filtroFechaInicio()"
            (change)="actualizarFechaInicio($any($event.target).value)">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Fecha fin</label>
            <input type="date" class="w-full border rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500"
              [value]="filtroFechaFin()"
              (change)="actualizarFechaFin($any($event.target).value)">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Monto mínimo</label>
              <input type="number" min="0" step="0.01"
                class="w-full border rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500"
                [value]="filtroMontoMin()"
                (input)="actualizarMontoMin($any($event.target).value)">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Monto máximo</label>
                <input type="number" min="0" step="0.01"
                  class="w-full border rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500"
                  [value]="filtroMontoMax()"
                  (input)="actualizarMontoMax($any($event.target).value)">
                </div>
              </div>
            </section>

            <section class="bg-white rounded-lg shadow overflow-hidden">
              <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between px-6 py-4 border-b">
                <div>
                  <p class="text-sm text-gray-500">Mostrando {{ totalFiltradas() }} de {{ estadisticas().total }} ventas</p>
                  <p class="text-sm text-gray-500">Monto filtrado: {{ montoTotalFiltrado() | currency:'CRC':'symbol' }}</p>
                </div>
                <p class="text-sm text-gray-400">
                  Última actualización:
                  <span class="font-medium text-gray-600">{{ ultimaActualizacion()?.toLocaleString('es-CR') ?? 'Pendiente' }}</span>
                </p>
              </div>

              @if (loading()) {
                <div class="p-6 space-y-4">
                  <div class="animate-pulse space-y-3">
                    <div class="h-4 bg-slate-200 rounded"></div>
                    <div class="h-4 bg-slate-200 rounded"></div>
                    <div class="h-4 bg-slate-200 rounded"></div>
                  </div>
                </div>
              }

              @if (error() && !loading()) {
                <div class="p-6 text-red-700 bg-red-50 border-t border-red-200">
                  <p class="font-semibold mb-2">{{ error() }}</p>
                  <button type="button" class="px-4 py-2 bg-red-600 text-white rounded-md" (click)="refrescar()">
                    Reintentar
                  </button>
                </div>
              }

              @if (!loading() && !error()) {
                <div>
                  @if (!ventasFiltradas().length) {
                    <div class="p-6 text-center text-gray-500">
                      No hay ventas con los filtros actuales.
                    </div>
                  }
                  @if (ventasFiltradas().length) {
                    <div class="overflow-x-auto">
                      <table class="min-w-full text-sm">
                        <thead class="bg-gray-50 text-gray-600 uppercase text-xs">
                          <tr>
                            <th class="px-6 py-3 text-left">Factura</th>
                            <th class="px-6 py-3 text-left">Cliente</th>
                            <th class="px-6 py-3 text-left">Estado</th>
                            <th class="px-6 py-3 text-left">Fecha</th>
                            <th class="px-6 py-3 text-right">Monto</th>
                            <th class="px-6 py-3 text-center">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          @for (venta of ventasFiltradas(); track trackByVenta($index, venta)) {
                            <tr class="border-t hover:bg-gray-50">
                              <td class="px-6 py-4 font-semibold text-gray-900">{{ venta.codigo }}</td>
                              <td class="px-6 py-4">
                                <p class="font-medium text-gray-900">{{ venta.cliente }}</p>
                                <p class="text-xs text-gray-500">{{ venta.metodoPago || 'Método no registrado' }}</p>
                              </td>
                              <td class="px-6 py-4">
                                <span class="px-3 py-1 rounded-full text-xs font-semibold"
                                      [ngClass]="{
                                        'bg-emerald-100 text-emerald-800': venta.estado === 'Pagada',
                                        'bg-amber-100 text-amber-800': venta.estado === 'Pendiente',
                                        'bg-rose-100 text-rose-800': venta.estado === 'Anulada'
                                      }">
                                  {{ venta.estado }}
                                </span>
                              </td>
                              <td class="px-6 py-4 text-gray-600">{{ formatearFechaTabla(venta.fecha) }}</td>
                              <td class="px-6 py-4 text-right font-semibold text-gray-900">{{ venta.montoTotal | currency:'CRC':'symbol' }}</td>
                              <td class="px-6 py-4 text-center">
                                <a [routerLink]="['/salidas', 'detalle', venta.id]" class="text-blue-600 font-semibold hover:underline">
                                  Ver factura
                                </a>
                              </td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                  }
                </div>
              }
            </section>
          </div>
  `,
  styles: [`

  `],
})
export class ListaVentas {
  private readonly ventasService = inject(VentasService);
  private readonly notificaciones = inject(NotificacionesService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal<boolean>(true);
  readonly error = signal<string | null>(null);
  readonly ventas = signal<Venta[]>([]);
  readonly filtroEstado = signal<'todos' | Venta['estado']>('todos');
  readonly filtroCliente = signal<string>('');
  readonly filtroFechaInicio = signal<string>('');
  readonly filtroFechaFin = signal<string>('');
  readonly filtroMontoMin = signal<string>('');
  readonly filtroMontoMax = signal<string>('');
  readonly ultimaActualizacion = signal<Date | null>(null);
  readonly exportando = signal<boolean>(false);

  readonly estadisticas = computed(() => {
    const ventas = this.ventas();
    const total = ventas.length;
    const montoTotal = ventas.reduce((acc, venta) => acc + venta.montoTotal, 0);
    const pagadas = ventas.filter(venta => venta.estado === 'Pagada');
    const pendientes = ventas.filter(venta => venta.estado === 'Pendiente');
    const anuladas = ventas.filter(venta => venta.estado === 'Anulada');
    return {
      total,
      montoTotal,
      pagadas: pagadas.length,
      montoPagado: pagadas.reduce((acc, venta) => acc + venta.montoTotal, 0),
      pendientes: pendientes.length,
      montoPendiente: pendientes.reduce((acc, venta) => acc + venta.montoTotal, 0),
      anuladas: anuladas.length,
      montoAnulado: anuladas.reduce((acc, venta) => acc + venta.montoTotal, 0)
    };
  });

  readonly ventasFiltradas = computed(() => {
    const estado = this.filtroEstado();
    const termino = this.filtroCliente().trim().toLowerCase();
    const fechaInicio = this.parseFechaFiltro(this.filtroFechaInicio());
    const fechaFin = this.parseFechaFiltro(this.filtroFechaFin(), true);
    const montoMin = this.parseNumero(this.filtroMontoMin());
    const montoMax = this.parseNumero(this.filtroMontoMax());

    return this.ventas().filter(venta => {
      if (estado !== 'todos' && venta.estado !== estado) {
        return false;
      }
      if (termino) {
        const cliente = venta.cliente?.toLowerCase() ?? '';
        const codigo = venta.codigo?.toLowerCase() ?? '';
        if (!cliente.includes(termino) && !codigo.includes(termino)) {
          return false;
        }
      }
      const fechaVenta = this.parseFechaApi(venta.fecha);
      if (fechaInicio && (!fechaVenta || fechaVenta < fechaInicio)) {
        return false;
      }
      if (fechaFin && (!fechaVenta || fechaVenta > fechaFin)) {
        return false;
      }
      if (montoMin != null && venta.montoTotal < montoMin) {
        return false;
      }
      if (montoMax != null && venta.montoTotal > montoMax) {
        return false;
      }
      return true;
    });
  });

  readonly totalFiltradas = computed(() => this.ventasFiltradas().length);
  readonly montoTotalFiltrado = computed(() =>
    this.ventasFiltradas().reduce((acc, venta) => acc + venta.montoTotal, 0)
  );

  constructor() {
    this.cargarVentas();
  }

  refrescar(): void {
    this.cargarVentas(true);
  }

  actualizarCliente(valor: string): void {
    this.filtroCliente.set(valor);
  }

  actualizarEstado(valor: string): void {
    if (valor === 'todos' || valor === 'Pagada' || valor === 'Pendiente' || valor === 'Anulada') {
      this.filtroEstado.set(valor);
    }
  }

  actualizarFechaInicio(valor: string): void {
    this.filtroFechaInicio.set(valor);
  }

  actualizarFechaFin(valor: string): void {
    this.filtroFechaFin.set(valor);
  }

  actualizarMontoMin(valor: string): void {
    this.filtroMontoMin.set(valor);
  }

  actualizarMontoMax(valor: string): void {
    this.filtroMontoMax.set(valor);
  }

  limpiarFiltros(): void {
    this.filtroEstado.set('todos');
    this.filtroCliente.set('');
    this.filtroFechaInicio.set('');
    this.filtroFechaFin.set('');
    this.filtroMontoMin.set('');
    this.filtroMontoMax.set('');
  }

  exportarCsv(): void {
    const enNavegador = typeof window !== 'undefined' && typeof document !== 'undefined';
    if (!enNavegador) {
      this.notificaciones.error('La exportación está disponible solo en el navegador.');
      return;
    }

    const datos = this.ventasFiltradas();
    if (!datos.length) {
      this.notificaciones.info('No hay ventas para exportar.');
      return;
    }

    this.exportando.set(true);
    try {
      const encabezados = ['Factura', 'Cliente', 'Fecha', 'Estado', 'Monto'];
      const filas = datos.map(venta => [
        this.sanitizarCsv(venta.codigo),
        this.sanitizarCsv(venta.cliente),
        this.formatearFechaTabla(venta.fecha),
        venta.estado,
        venta.montoTotal.toFixed(2)
      ]);
      const contenido = [encabezados, ...filas]
        .map(celdas => celdas.join(';'))
        .join('\r\n');

      const blob = new Blob(['\uFEFF' + contenido], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = `ventas-${Date.now()}.csv`;
      enlace.style.display = 'none';
      document.body.appendChild(enlace);
      enlace.click();
      document.body.removeChild(enlace);
      URL.revokeObjectURL(url);
      this.notificaciones.exito('Se exportó el historial de ventas.');
    } catch (error) {
      console.error('No se pudo exportar el historial', error);
      this.notificaciones.error('Ocurrió un error al generar el archivo.');
    } finally {
      this.exportando.set(false);
    }
  }

  trackByVenta = (_: number, venta: Venta): number => venta.id;

  formatearFechaTabla(valor: string): string {
    const fecha = this.parseFechaApi(valor);
    if (!fecha) {
      return '—';
    }
    return fecha.toLocaleDateString('es-CR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  private cargarVentas(esRefresco = false): void {
    this.loading.set(true);
    this.error.set(null);

    this.ventasService
      .obtenerVentas()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
        catchError(error => {
          console.error('No se pudo cargar el historial de ventas', error);
          this.error.set('No se pudo cargar el historial de ventas. Intenta nuevamente.');
          this.notificaciones.error('No se pudo cargar el historial de ventas.');
          return EMPTY;
        })
      )
      .subscribe(ventas => {
        this.ventas.set(ventas);
        this.ultimaActualizacion.set(new Date());
        const mensaje = esRefresco ? 'Ventas actualizadas.' : 'Ventas cargadas.';
        this.notificaciones.info(mensaje);
      });
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

  private parseNumero(valor: string): number | null {
    if (!valor) {
      return null;
    }
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : null;
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
