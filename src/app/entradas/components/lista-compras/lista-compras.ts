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
  templateUrl: './lista-compras.html',
  styleUrl: './lista-compras.css'
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
