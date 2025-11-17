export type CategoriaCliente = 'Premium' | 'Frecuente' | 'Ocasional';

export interface Cliente {
  id: number;
  nombre: string;
  correo: string;
  telefono?: string | null;
  categoria: CategoriaCliente;
  ubicacion?: string | null;
  fechaRegistro?: string | null;
  comprasUltimoMes?: number;
  montoAcumulado?: number;
}

export interface RegistrarClientePayload {
  nombre: string;
  correo: string;
  telefono?: string | null;
  categoria?: CategoriaCliente;
  ubicacion?: string | null;
}
