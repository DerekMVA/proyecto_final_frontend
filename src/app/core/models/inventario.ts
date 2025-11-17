export interface InventarioItem {
  id: number;
  codigo: string;
  nombre: string;
  categoria: string;
  estado?: string | null;
  stockActual: number;
  stockMinimo?: number | null;
  stockMaximo?: number | null;
  precioUnitario: number;
  ubicacion?: string | null;
  actualizado?: string | null;
}

export interface AjusteInventarioPayload {
  idProducto: number;
  cantidadAnterior: number;
  cantidadNueva: number;
  motivo: string;
  observaciones?: string | null;
}

export interface AjusteInventarioResponse {
  id: number;
  idProducto: number;
  cantidadAnterior: number;
  cantidadNueva: number;
  motivo: string;
  observaciones?: string | null;
  realizadoPor?: string | null;
  fecha?: string | null;
  productoActualizado?: InventarioItem;
}
