export type PeriodoTendencia = 'semanal' | 'mensual' | 'trimestral';

export interface ResumenAdministrativo {
  ventasMes: number;
  variacionVentas: number;
  ordenesActivas: number;
  variacionOrdenes: number;
  productosBajoStock: number;
  variacionStock: number;
  nuevosClientes: number;
  variacionClientes: number;
  fechaCorte: string;
}

export interface TendenciaAdministrativa {
  periodo: string;
  ventas: number;
  ordenes: number;
  ingresos: number;
  egresos: number;
}

export type CriticidadAlerta = 'baja' | 'media' | 'alta';

export interface AlertaAdministrativa {
  id: number;
  tipo: string;
  modulo: string;
  mensaje: string;
  criticidad: CriticidadAlerta;
  fecha: string;
}

export type FormatoReporte = 'pdf' | 'xlsx' | 'csv';

export interface ReportePlantilla {
  id: string;
  nombre: string;
  descripcion: string;
  formatos: FormatoReporte[];
  requiereFechas: boolean;
}

export interface ExportarReportePayload {
  idPlantilla: string;
  formato: FormatoReporte;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  incluirDetalles?: boolean;
}
