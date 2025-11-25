import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Tecnico } from '../models/tecnico';
import { Usuario } from '../models/usuario';

@Injectable({ providedIn: 'root' })
export class TecnicosService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  obtenerTecnicos(): Observable<Tecnico[]> {
    return this.http.get<Usuario[]>(`${this.baseUrl}/Usuarios`).pipe(
      map(usuarios =>
        usuarios
          .filter(usuario => !usuario.deleted)
          .map(usuario => ({
            id: usuario.id,
            nombre: usuario.nombreCompleto,
            especialidad: usuario.rol?.nombre ?? 'Generalista',
            disponibilidad: 'Disponible' as const
          }))
      )
    );
  }
}
