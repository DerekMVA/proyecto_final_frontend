export interface Tecnico {
  id: number;
  nombre: string;
  especialidad?: string | null;
  disponibilidad?: 'Disponible' | 'Ocupado' | 'En licencia';
}
