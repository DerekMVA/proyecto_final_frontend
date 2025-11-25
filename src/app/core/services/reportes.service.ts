import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, map, Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AlertaAdministrativa,
  ExportarReportePayload,
  PeriodoTendencia,
  ReportePlantilla,
  ResumenAdministrativo,
  TendenciaAdministrativa
} from '../models/reporte';
import { Venta } from '../models/venta';
import { InventarioItem } from '../models/inventario';
import { Cliente } from '../models/cliente';
import { OrdenEnsamble } from '../models/ensamble';
import { TicketMantenimiento } from '../models/mantenimiento';

@Injectable({ providedIn: 'root' })
export class ReportesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  obtenerResumen(): Observable<ResumenAdministrativo> {
    return forkJoin({
      ventas: this.http.get<Venta[]>(`${this.baseUrl}/Ventas`),
      productos: this.http.get<InventarioItem[]>(`${this.baseUrl}/Productos`),
      clientes: this.http.get<Cliente[]>(`${this.baseUrl}/Clientes`),
      ensambles: this.http.get<OrdenEnsamble[]>(`${this.baseUrl}/OrdenesEnsambles`),
      reparaciones: this.http.get<TicketMantenimiento[]>(`${this.baseUrl}/Reparaciones`)
    }).pipe(map(data => this.calcularResumen(data)));
  }

  obtenerTendencias(periodo: PeriodoTendencia): Observable<TendenciaAdministrativa[]> {
    return this.http.get<Venta[]>(`${this.baseUrl}/Ventas`).pipe(
      map(ventas => this.calcularTendencias(ventas, periodo))
    );
  }

  obtenerAlertas(): Observable<AlertaAdministrativa[]> {
    return forkJoin({
      productos: this.http.get<InventarioItem[]>(`${this.baseUrl}/Productos`),
      reparaciones: this.http.get<TicketMantenimiento[]>(`${this.baseUrl}/Reparaciones`)
    }).pipe(map(({ productos, reparaciones }) => this.generarAlertas(productos, reparaciones)));
  }

  obtenerPlantillas(): Observable<ReportePlantilla[]> {
    return of([
      {
        id: 'resumen-operativo',
        nombre: 'Resumen operativo',
        descripcion: 'Ventas, órdenes activas y tickets abiertos.',
        formatos: ['pdf', 'xlsx'],
        requiereFechas: false
      },
      {
        id: 'detalle-ventas',
        nombre: 'Detalle de ventas',
        descripcion: 'Listado de ventas con totales diarios.',
        formatos: ['csv', 'xlsx'],
        requiereFechas: true
      }
    ]);
  }

  exportarReporte(payload: ExportarReportePayload): Observable<Blob> {
    const contenido = `Reporte: ${payload.idPlantilla}\nFormato: ${payload.formato}\n`;
    return of(new Blob([contenido], { type: 'text/plain' }));
  }

  private calcularResumen(data: {
    ventas: Venta[];
    productos: InventarioItem[];
    clientes: Cliente[];
    ensambles: OrdenEnsamble[];
    reparaciones: TicketMantenimiento[];
  }): ResumenAdministrativo {
    const ventasMes = data.ventas.reduce((acc, venta) => acc + (venta.montoTotal ?? 0), 0);
    const ordenesActivas = data.ensambles.length + data.reparaciones.length;
    const productosBajoStock = data.productos.filter(
      producto => producto.stockMinimo !== undefined && producto.stockActual <= (producto.stockMinimo ?? 0)
    ).length;
    const nuevosClientes = data.clientes.filter(cliente => this.esDelMesActual(cliente.fechaRegistro)).length;

    return {
      ventasMes,
      variacionVentas: 0,
      ordenesActivas,
      variacionOrdenes: 0,
      productosBajoStock,
      variacionStock: 0,
      nuevosClientes,
      variacionClientes: 0,
      fechaCorte: new Date().toISOString()
    };
  }

  private calcularTendencias(ventas: Venta[], periodo: PeriodoTendencia): TendenciaAdministrativa[] {
    const grupos = new Map<string, { ventas: number; ordenes: number; ingresos: number; egresos: number }>();

    ventas.forEach(venta => {
      const clave = this.obtenerClavePeriodo(venta.fecha, periodo);
      if (!grupos.has(clave)) {
        grupos.set(clave, { ventas: 0, ordenes: 0, ingresos: 0, egresos: 0 });
      }
      const grupo = grupos.get(clave)!;
      grupo.ventas += 1;
      grupo.ordenes += 1;
      grupo.ingresos += venta.montoTotal ?? 0;
      grupo.egresos += (venta.montoTotal ?? 0) * 0.35;
    });

    return Array.from(grupos.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([periodoClave, valores]) => ({ periodo: periodoClave, ...valores }));
  }

  private generarAlertas(
    productos: InventarioItem[],
    reparaciones: TicketMantenimiento[]
  ): AlertaAdministrativa[] {
    const alertas: AlertaAdministrativa[] = [];

    const criticos = productos
      .filter(producto => producto.stockActual <= (producto.stockMinimo ?? 0))
      .slice(0, 3);

    criticos.forEach((producto, index) => {
      alertas.push({
        id: index + 1,
        tipo: 'Inventario',
        modulo: 'Inventario',
        mensaje: `El producto ${producto.nombre} está por debajo del stock mínimo`,
        criticidad: 'alta',
        fecha: new Date().toISOString()
      });
    });

    const pendientes = reparaciones.filter(ticket => ticket.estado !== 'Entregado').slice(0, 2);
    pendientes.forEach((ticket, index) => {
      alertas.push({
        id: criticos.length + index + 1,
        tipo: 'Mantenimiento',
        modulo: 'Mantenimiento',
        mensaje: `Ticket ${ticket.codigo} continúa en estado ${ticket.estado}.`,
        criticidad: 'media',
        fecha: ticket.ultimoMovimiento ?? new Date().toISOString()
      });
    });

    return alertas;
  }

  private esDelMesActual(fecha?: string | null): boolean {
    if (!fecha) {
      return false;
    }
    const valor = new Date(fecha);
    if (Number.isNaN(valor.getTime())) {
      return false;
    }
    const hoy = new Date();
    return valor.getMonth() === hoy.getMonth() && valor.getFullYear() === hoy.getFullYear();
  }

  private obtenerClavePeriodo(fechaIso: string, periodo: PeriodoTendencia): string {
    const fecha = new Date(fechaIso);
    if (Number.isNaN(fecha.getTime())) {
      return 'Sin fecha';
    }

    const mes = fecha.toLocaleString('es-CR', { month: 'short' });
    const anio = fecha.getFullYear();

    switch (periodo) {
      case 'semanal':
        const semana = this.obtenerNumeroSemana(fecha);
        return `Sem ${semana} ${anio}`;
      case 'trimestral':
        const trimestre = Math.floor(fecha.getMonth() / 3) + 1;
        return `Q${trimestre} ${anio}`;
      case 'mensual':
      default:
        return `${mes.toUpperCase()} ${anio}`;
    }
  }

  private obtenerNumeroSemana(fecha: Date): number {
    const temp = new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()));
    const dia = temp.getUTCDay() || 7;
    temp.setUTCDate(temp.getUTCDate() + 4 - dia);
    const inicioAnio = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1));
    const diferencia = temp.getTime() - inicioAnio.getTime();
    return Math.ceil(((diferencia / 86400000) + 1) / 7);
  }
}
