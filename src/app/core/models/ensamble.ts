export type EstadoEnsamble = 'Pendiente' | 'En progreso' | 'En pruebas' | 'Completado' | 'Entregado';
export type PrioridadEnsamble = 'Alta' | 'Media' | 'Baja';

export interface ComponenteOrden {
  id: number;
  nombre: string;
  categoria?: string | null;
  codigoInventario?: string | null;
  requerido: boolean;
  instalado: boolean;
}

export interface OrdenEnsamble {
  id: number;
  codigo: string;
  descripcion: string;
  cliente: string;
  prioridad: PrioridadEnsamble;
  estado: EstadoEnsamble;
  tecnicoAsignado?: string | null;
  progreso?: number;
  fechaSolicitud?: string | null;
  fechaEntregaEstimada?: string | null;
  componentes: ComponenteOrden[];
  notas?: string | null;
  pruebasRealizadas?: string | null;
}

export interface ActualizarEstadoEnsamblePayload {
  estado: EstadoEnsamble;
  notas?: string | null;
}

export interface RegistrarAvanceEnsamblePayload {
  componentesCompletados: number[];
  notas?: string | null;
  pruebasRealizadas?: string | null;
  tiempoEmpleadoHoras?: number | null;
  estadoObjetivo?: EstadoEnsamble;
}
