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
  templateUrl: './lista-ventas.html',
  styleUrl: './lista-ventas.css'
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
