import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Cliente, RegistrarClientePayload } from '../models/cliente';

@Injectable({ providedIn: 'root' })
export class ClientesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  obtenerClientes(): Observable<Cliente[]> {
    return this.http.get<Cliente[]>(`${this.baseUrl}/Clientes`);
  }

  registrarCliente(payload: RegistrarClientePayload): Observable<Cliente> {
    return this.http.post<Cliente>(`${this.baseUrl}/Clientes`, payload);
  }
}
