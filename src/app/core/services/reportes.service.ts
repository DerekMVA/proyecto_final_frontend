import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AlertaAdministrativa,
  ExportarReportePayload,
  PeriodoTendencia,
  ReportePlantilla,
  ResumenAdministrativo,
  TendenciaAdministrativa
} from '../models/reporte';

@Injectable({ providedIn: 'root' })
export class ReportesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  obtenerResumen(): Observable<ResumenAdministrativo> {
    return this.http.get<ResumenAdministrativo>(`${this.baseUrl}/Reportes/resumen-admin`);
  }

  obtenerTendencias(periodo: PeriodoTendencia): Observable<TendenciaAdministrativa[]> {
    return this.http.get<TendenciaAdministrativa[]>(`${this.baseUrl}/Reportes/tendencias`, {
      params: { periodo }
    });
  }

  obtenerAlertas(): Observable<AlertaAdministrativa[]> {
    return this.http.get<AlertaAdministrativa[]>(`${this.baseUrl}/Reportes/alertas`);
  }

  obtenerPlantillas(): Observable<ReportePlantilla[]> {
    return this.http.get<ReportePlantilla[]>(`${this.baseUrl}/Reportes/plantillas`);
  }

  exportarReporte(payload: ExportarReportePayload): Observable<Blob> {
    return this.http.post(`${this.baseUrl}/Reportes/exportar`, payload, {
      responseType: 'blob'
    });
  }
}
