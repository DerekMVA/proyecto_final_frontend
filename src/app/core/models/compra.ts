export interface Compra {
  id: number;
  idProveedor?: number;
  codigo: string;
  proveedor: string;
  fecha: string;
  montoTotal: number;
  estado: 'Pendiente' | 'Completada' | 'Cancelada';
  detalles?: CompraDetalleLinea[];
  observaciones?: string | null;
}

export interface CompraDetalleLinea {
  id: number;
  producto?: string;
  descripcion?: string;
  cantidad: number;
  precioUnitario: number;
  total?: number;
}

export interface CompraDetalleCrear {
  idProducto?: number | null;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
}

export interface CompraCrear {
  idProveedor: number;
  fecha: string;
  observaciones?: string | null;
  detalles: CompraDetalleCrear[];
}
