import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Usuario } from '../models/usuario';
import { environment } from '../../../environments/environment';

interface UsuarioUpsert {
  nombreCompleto: string;
  nombreUsuario: string;
  salario: number;
  idRol: number;
  contrasena?: string;
}

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  getUsuarios(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(`${this.baseUrl}/Usuarios`);
  }

  getUsuario(id: number): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.baseUrl}/Usuarios/${id}`);
  }

  createUsuario(payload: UsuarioUpsert): Observable<Usuario> {
    return this.http.post<Usuario>(`${this.baseUrl}/Usuarios`, payload);
  }

  updateUsuario(id: number, payload: UsuarioUpsert): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/Usuarios/${id}`, { id, ...payload });
  }

  deleteUsuario(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/Usuarios/${id}`);
  }

  reactivateUsuario(id: number): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/Usuarios/${id}/reactivar`, {});
  }
}
