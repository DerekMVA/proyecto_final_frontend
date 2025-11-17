import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, finalize, forkJoin } from 'rxjs';
import { ReportesService } from '../../../core/services/reportes.service';
import { NotificacionesService } from '../../../core/services/notificaciones.service';
import {
  AlertaAdministrativa,
  ExportarReportePayload,
  FormatoReporte,
  PeriodoTendencia,
  ReportePlantilla,
  ResumenAdministrativo,
  TendenciaAdministrativa
} from '../../../core/models/reporte';

@Component({
  selector: 'app-dashboard-reportes',
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './dashboard-reportes.html',
  styleUrl: './dashboard-reportes.css'
})
export class DashboardReportes {
  private readonly reportesService = inject(ReportesService);
  private readonly notificaciones = inject(NotificacionesService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = typeof window !== 'undefined';

  readonly loading = signal<boolean>(true);
  readonly error = signal<string | null>(null);
  readonly resumen = signal<ResumenAdministrativo | null>(null);
  readonly alertas = signal<AlertaAdministrativa[]>([]);
  readonly tendencias = signal<TendenciaAdministrativa[]>([]);
  readonly plantillas = signal<ReportePlantilla[]>([]);
  readonly periodo = signal<PeriodoTendencia>('mensual');
  readonly tendenciasCargando = signal<boolean>(false);
  readonly tendenciasError = signal<string | null>(null);
  readonly ultimaActualizacion = signal<Date | null>(null);
  readonly generando = signal<boolean>(false);
  readonly exportError = signal<string | null>(null);

  readonly periodosDisponibles: { valor: PeriodoTendencia; etiqueta: string }[] = [
    { valor: 'semanal', etiqueta: 'Últimas semanas' },
    { valor: 'mensual', etiqueta: 'Últimos meses' },
    { valor: 'trimestral', etiqueta: 'Últimos trimestres' }
  ];

  readonly form = this.fb.group({
    plantilla: this.fb.control<string | null>(null, { validators: [Validators.required] }),
    formato: this.fb.control<FormatoReporte>('pdf', {
      nonNullable: true,
      validators: [Validators.required]
    }),
    fechaInicio: this.fb.control<string>(''),
    fechaFin: this.fb.control<string>(''),
    incluirDetalles: this.fb.control<boolean>(true, { nonNullable: true })
  });

  private readonly formValores = signal(this.form.getRawValue());

  readonly plantillaSeleccionada = computed(() => {
    const id = this.formValores().plantilla;
    if (!id) {
      return null;
    }
    return this.plantillas().find(plantilla => plantilla.id === id) ?? null;
  });

  readonly alertasVisibles = computed(() => this.alertas().slice(0, 5));

  constructor() {
    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.formValores.set(this.form.getRawValue()));

    this.form.controls.plantilla.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.ajustarFormatoSegunPlantilla());

    this.cargarPanel();
  }

  refrescar(): void {
    this.cargarPanel(true);
  }

  cambiarPeriodo(periodo: string): void {
    if (periodo !== 'semanal' && periodo !== 'mensual' && periodo !== 'trimestral') {
      return;
    }
    if (this.periodo() === periodo) {
      return;
    }
    this.periodo.set(periodo);
    this.cargarTendencias();
  }

  trackByTendencia = (_: number, tendencia: TendenciaAdministrativa): string => tendencia.periodo;
  trackByAlerta = (_: number, alerta: AlertaAdministrativa): number => alerta.id;

  formatearMoneda(valor?: number | null): string {
    if (valor === null || valor === undefined) {
      return '—';
    }
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: 'CRC',
      maximumFractionDigits: 0
    }).format(valor);
  }

  formatearNumero(valor?: number | null): string {
    if (valor === null || valor === undefined) {
      return '—';
    }
    return new Intl.NumberFormat('es-CR').format(valor);
  }

  variacionClase(valor?: number | null): string {
    if (valor === null || valor === undefined) {
      return 'text-gray-500';
    }
    return valor >= 0 ? 'text-emerald-600' : 'text-rose-600';
  }

  variacionEtiqueta(valor?: number | null): string {
    if (valor === null || valor === undefined) {
      return 'Sin variación';
    }
    const prefijo = valor > 0 ? '+' : '';
    return `${prefijo}${valor.toFixed(1)}% vs periodo previo`;
  }

  alertaClase(criticidad: string): string {
    switch (criticidad) {
      case 'alta':
        return 'bg-rose-50 text-rose-700';
      case 'media':
        return 'bg-amber-50 text-amber-700';
      default:
        return 'bg-sky-50 text-sky-700';
    }
  }

  generarReporte(): void {
    this.exportError.set(null);
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    const valores = this.formValores();
    const plantilla = this.plantillaSeleccionada();
    if (!plantilla) {
      this.exportError.set('Selecciona el tipo de reporte.');
      return;
    }

    if (plantilla.requiereFechas && (!valores.fechaInicio || !valores.fechaFin)) {
      this.exportError.set('El reporte seleccionado requiere un rango de fechas.');
      return;
    }

    if (
      valores.fechaInicio &&
      valores.fechaFin &&
      new Date(valores.fechaInicio) > new Date(valores.fechaFin)
    ) {
      this.exportError.set('La fecha de inicio no puede ser posterior a la fecha final.');
      return;
    }

    if (!this.isBrowser) {
      this.exportError.set('La exportación solo está disponible en el navegador.');
      return;
    }

    const payload: ExportarReportePayload = {
      idPlantilla: plantilla.id,
      formato: (valores.formato ?? 'pdf') as FormatoReporte,
      fechaInicio: valores.fechaInicio || null,
      fechaFin: valores.fechaFin || null,
      incluirDetalles: valores.incluirDetalles ?? false
    };

    this.generando.set(true);

    this.reportesService
      .exportarReporte(payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.generando.set(false)),
        catchError(error => {
          console.error('No se pudo exportar el reporte', error);
          this.exportError.set('No se pudo exportar el reporte. Intenta nuevamente.');
          this.notificaciones.error('No se pudo generar el reporte.');
          return EMPTY;
        })
      )
      .subscribe(blob => {
        this.descargarArchivo(blob, `${plantilla.id}-${Date.now()}.${payload.formato}`);
        this.notificaciones.exito('Reporte generado correctamente.');
      });
  }

  formatosDisponibles(): FormatoReporte[] {
    const plantilla = this.plantillaSeleccionada();
    if (!plantilla || !plantilla.formatos.length) {
      return ['pdf'];
    }
    return plantilla.formatos;
  }

  limpiarFechas(): void {
    this.form.patchValue(
      {
        fechaInicio: '',
        fechaFin: '',
        incluirDetalles: true
      },
      { emitEvent: false }
    );
    this.formValores.set(this.form.getRawValue());
  }

  private cargarPanel(esRefresco = false): void {
    this.loading.set(true);
    this.error.set(null);
    this.tendenciasError.set(null);

    forkJoin({
      resumen: this.reportesService.obtenerResumen(),
      alertas: this.reportesService.obtenerAlertas(),
      plantillas: this.reportesService.obtenerPlantillas(),
      tendencias: this.reportesService.obtenerTendencias(this.periodo())
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
        catchError(error => {
          console.error('No se pudo cargar el panel administrativo', error);
          this.error.set('No se pudo cargar la información administrativa.');
          this.notificaciones.error('No se pudo actualizar el panel.');
          return EMPTY;
        })
      )
      .subscribe(({ resumen, alertas, plantillas, tendencias }) => {
        this.resumen.set(resumen);
        this.alertas.set(alertas);
        this.plantillas.set(plantillas);
        this.tendencias.set(tendencias);
        this.establecerPlantillaPorDefecto();
        this.ultimaActualizacion.set(new Date());
        const mensaje = esRefresco ? 'Panel administrativo actualizado.' : 'Panel administrativo listo.';
        this.notificaciones.info(mensaje);
      });
  }

  private cargarTendencias(): void {
    this.tendenciasCargando.set(true);
    this.tendenciasError.set(null);
    this.reportesService
      .obtenerTendencias(this.periodo())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.tendenciasCargando.set(false)),
        catchError(error => {
          console.error('No se pudieron cargar las tendencias', error);
          this.tendenciasError.set('No se pudo cargar la información de tendencias.');
          this.notificaciones.error('No se pudo actualizar las tendencias.');
          return EMPTY;
        })
      )
      .subscribe(tendencias => {
        this.tendencias.set(tendencias);
      });
  }

  private establecerPlantillaPorDefecto(): void {
    const listado = this.plantillas();
    if (!listado.length) {
      return;
    }
    const actual = this.formValores().plantilla;
    const existe = actual ? listado.find(plantilla => plantilla.id === actual) : null;
    const porDefecto = existe ?? listado[0];
    const formatoActual = this.formValores().formato;
    const formatoValido =
      porDefecto.formatos.includes(formatoActual as FormatoReporte) && formatoActual
        ? (formatoActual as FormatoReporte)
        : porDefecto.formatos[0] ?? 'pdf';
    this.form.patchValue(
      {
        plantilla: porDefecto.id,
        formato: formatoValido
      },
      { emitEvent: false }
    );
    this.formValores.set(this.form.getRawValue());
  }

  private ajustarFormatoSegunPlantilla(): void {
    const plantilla = this.plantillaSeleccionada();
    if (!plantilla || !plantilla.formatos.length) {
      return;
    }
    const formatoActual = this.formValores().formato as FormatoReporte | null;
    if (formatoActual && plantilla.formatos.includes(formatoActual)) {
      return;
    }
    this.form.patchValue({ formato: plantilla.formatos[0] }, { emitEvent: false });
    this.formValores.set(this.form.getRawValue());
  }

  private descargarArchivo(blob: Blob, nombre: string): void {
    if (!this.isBrowser) {
      return;
    }
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombre;
    enlace.style.display = 'none';
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    URL.revokeObjectURL(url);
  }
}
