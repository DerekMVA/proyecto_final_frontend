import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Tecnico } from '../models/tecnico';

@Injectable({ providedIn: 'root' })
export class TecnicosService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  obtenerTecnicos(): Observable<Tecnico[]> {
    return this.http.get<Tecnico[]>(`${this.baseUrl}/Tecnicos`);
  }
}
