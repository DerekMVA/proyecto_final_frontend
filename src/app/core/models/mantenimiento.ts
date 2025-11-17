export type EstadoMantenimiento = 'En diagnóstico' | 'En reparación' | 'En pruebas' | 'Listo' | 'Entregado';
export type PrioridadMantenimiento = 'Alta' | 'Media' | 'Baja';

export interface TicketMantenimiento {
  id: number;
  codigo: string;
  equipo: string;
  cliente: string;
  prioridad: PrioridadMantenimiento;
  estado: EstadoMantenimiento;
  tipoServicio?: string | null;
  diagnostico?: string | null;
  diagnosticoTecnico?: string | null;
  accionesRealizadas?: string | null;
  piezasUtilizadas?: string[] | null;
  tecnicoAsignado?: string | null;
  ingreso?: string | null;
  entregaEstimada?: string | null;
  progreso?: number;
  tiempoEnColaHoras?: number;
  observaciones?: string | null;
  ultimoMovimiento?: string | null;
}

export interface ActualizarEstadoPayload {
  estado: EstadoMantenimiento;
  observaciones?: string | null;
}

export interface AsignarTecnicoPayload {
  tecnico: string;
}

export interface RegistrarReparacionPayload {
  diagnostico: string;
  accionesRealizadas?: string | null;
  piezasUtilizadas?: string[];
  tiempoEmpleadoHoras?: number | null;
  costoEstimado?: number | null;
}
