export type EstadoVenta = 'Pendiente' | 'Pagada' | 'Anulada';

export interface VentaDetalle {
  producto: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface Venta {
  id: number;
  codigo: string;
  clienteId?: number | null;
  cliente: string;
  clienteCorreo?: string | null;
  clienteTelefono?: string | null;
  fecha: string;
  estado: EstadoVenta;
  montoTotal: number;
  metodoPago?: string | null;
  vendedor?: string | null;
  observaciones?: string | null;
  detalles?: VentaDetalle[];
}

export interface CrearVentaDetallePayload {
  productoId: number;
  cantidad: number;
  precioUnitario: number;
}

export interface RegistrarVentaPayload {
  clienteId?: number | null;
  cliente: string;
  metodoPago?: string | null;
  vendedor?: string | null;
  observaciones?: string | null;
  detalles: CrearVentaDetallePayload[];
}
