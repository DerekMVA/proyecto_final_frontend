export interface Rol {
  id: number;
  nombre: string;
  descripcion: string;
  deleted: boolean;
}

export interface Usuario {
  id: number;
  nombreCompleto: string;
  nombreUsuario: string;
  salario: number;
  deleted: boolean;
  idRol: number;
  rol?: Rol | null;
}
