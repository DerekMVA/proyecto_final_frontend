export type TipoOrden = 'Ensamble' | 'Mantenimiento';
export type EstadoOrden = 'Borrador' | 'Registrada' | 'En progreso' | 'Finalizada' | 'Cancelada';
export type PrioridadOrden = 'Alta' | 'Media' | 'Baja';

export interface OrdenTrabajo {
  id: number;
  codigo: string;
  tipo: TipoOrden;
  clienteId: number;
  clienteNombre: string;
  descripcion: string;
  estado: EstadoOrden;
  prioridad: PrioridadOrden;
  tecnicoAsignado?: string | null;
  canal?: string | null;
  fechaCreacion?: string | null;
  fechaActualizacion?: string | null;
}

export interface CrearOrdenPayload {
  tipo: TipoOrden;
  clienteId: number;
  descripcion: string;
  prioridad: PrioridadOrden;
  tecnicoId?: number | null;
  canal?: string | null;
  observaciones?: string | null;
}
