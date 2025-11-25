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
  template: `
<div class="p-6 lg:p-8 space-y-8">
  <header class="flex flex-wrap items-start justify-between gap-4">
    <div class="space-y-2">
      <p class="text-sm font-semibold text-indigo-600 uppercase tracking-tight">Administración</p>
      <h1 class="text-3xl font-bold text-gray-900">Panel administrativo</h1>
      <p class="text-sm text-gray-500">Supervisa el pulso general de la operación y genera reportes ejecutivos.</p>
      <p class="text-xs text-gray-400">Última actualización: {{ ultimaActualizacion() ? (ultimaActualizacion() | date:'short') : '—' }}</p>
    </div>
    <div class="flex flex-wrap gap-3">
      <button type="button" class="btn-secondary" (click)="refrescar()">
        Actualizar
      </button>
      <a class="btn-primary" routerLink="/admin/usuarios">
        Gestionar usuarios
      </a>
    </div>
  </header>

  @if (loading()) {
    <section class="space-y-4">
      <div class="skeleton h-28"></div>
      <div class="skeleton h-56"></div>
      <div class="skeleton h-48"></div>
    </section>
  }

  @if (!loading() && error()) {
    <section class="alert-error">
      {{ error() }}
    </section>
  }

  @if (!loading() && !error()) {
    <section class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      <article class="stat-card">
        <p class="stat-label">Ventas del mes</p>
        <p class="stat-value">{{ formatearMoneda(resumen()?.ventasMes) }}</p>
        <span class="stat-variation" [ngClass]="variacionClase(resumen()?.variacionVentas)">
          {{ variacionEtiqueta(resumen()?.variacionVentas) }}
        </span>
      </article>
      <article class="stat-card">
        <p class="stat-label">Órdenes activas</p>
        <p class="stat-value">{{ formatearNumero(resumen()?.ordenesActivas) }}</p>
        <span class="stat-variation" [ngClass]="variacionClase(resumen()?.variacionOrdenes)">
          {{ variacionEtiqueta(resumen()?.variacionOrdenes) }}
        </span>
      </article>
      <article class="stat-card">
        <p class="stat-label">Productos bajo stock</p>
        <p class="stat-value">{{ formatearNumero(resumen()?.productosBajoStock) }}</p>
        <span class="stat-variation" [ngClass]="variacionClase(resumen()?.variacionStock)">
          {{ variacionEtiqueta(resumen()?.variacionStock) }}
        </span>
      </article>
      <article class="stat-card">
        <p class="stat-label">Nuevos clientes</p>
        <p class="stat-value">{{ formatearNumero(resumen()?.nuevosClientes) }}</p>
        <span class="stat-variation" [ngClass]="variacionClase(resumen()?.variacionClientes)">
          {{ variacionEtiqueta(resumen()?.variacionClientes) }}
        </span>
      </article>
    </section>
    <section class="panel">
      <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <p class="text-sm font-semibold text-gray-500 uppercase tracking-tight">Tendencias</p>
          <h2 class="text-2xl font-semibold text-gray-900">Desempeño consolidado</h2>
          <p class="text-sm text-gray-500">Seguimiento de ventas, órdenes e indicadores financieros.</p>
        </div>
        <label class="text-sm text-gray-600 space-y-1">
          Periodo
          <select class="input" [value]="periodo()" (change)="cambiarPeriodo($any($event.target).value)">
            @for (opcion of periodosDisponibles; track opcion) {
              <option [value]="opcion.valor">{{ opcion.etiqueta }}</option>
            }
          </select>
        </label>
      </div>
      @if (tendenciasCargando()) {
        <div class="space-y-3">
          <div class="skeleton h-24"></div>
          <div class="skeleton h-24"></div>
        </div>
      }
      @if (!tendenciasCargando() && tendenciasError()) {
        <div class="alert-error">
          {{ tendenciasError() }}
        </div>
      }
      @if (!tendenciasCargando() && !tendenciasError() && tendencias().length === 0) {
        <div class="empty-state">
          No hay datos suficientes para el periodo seleccionado.
        </div>
      }
      @if (!tendenciasCargando() && !tendenciasError() && tendencias().length > 0) {
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-gray-500">
                <th class="px-4 py-2 font-medium">Periodo</th>
                <th class="px-4 py-2 font-medium">Ventas</th>
                <th class="px-4 py-2 font-medium">Órdenes</th>
                <th class="px-4 py-2 font-medium">Ingresos</th>
                <th class="px-4 py-2 font-medium">Egresos</th>
              </tr>
            </thead>
            <tbody>
              @for (tendencia of tendencias(); track trackByTendencia($index, tendencia)) {
                <tr class="border-t border-gray-100">
                  <td class="px-4 py-3 font-medium text-gray-900">{{ tendencia.periodo }}</td>
                  <td class="px-4 py-3">{{ formatearNumero(tendencia.ventas) }}</td>
                  <td class="px-4 py-3">{{ formatearNumero(tendencia.ordenes) }}</td>
                  <td class="px-4 py-3">{{ formatearMoneda(tendencia.ingresos) }}</td>
                  <td class="px-4 py-3">{{ formatearMoneda(tendencia.egresos) }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>
    <section class="panel">
      <div class="flex items-center justify-between mb-4">
        <div>
          <p class="text-sm font-semibold text-gray-500 uppercase tracking-tight">Monitoreo</p>
          <h2 class="text-2xl font-semibold text-gray-900">Alertas críticas</h2>
          <p class="text-sm text-gray-500">Se muestran las últimas incidencias reportadas por los módulos.</p>
        </div>
        <span class="badge">{{ alertas().length }} activas</span>
      </div>
      @if (alertasVisibles().length === 0) {
        <div class="empty-state">
          No se registran alertas en este momento.
        </div>
      }
      @if (alertasVisibles().length > 0) {
        <ul class="space-y-3">
          @for (alerta of alertasVisibles(); track trackByAlerta($index, alerta)) {
            <li class="alert-card">
              <div>
                <p class="text-xs font-semibold text-gray-500 uppercase tracking-tight">{{ alerta.modulo }}</p>
                <p class="text-base font-semibold text-gray-900">{{ alerta.mensaje }}</p>
                <p class="text-sm text-gray-500">{{ alerta.tipo }}</p>
              </div>
              <div class="text-right space-y-1">
                <span class="chip" [ngClass]="alertaClase(alerta.criticidad)">{{ alerta.criticidad | titlecase }}</span>
                <p class="text-xs text-gray-500">{{ alerta.fecha | date:'short' }}</p>
              </div>
            </li>
          }
        </ul>
      }
    </section>
    <section class="panel space-y-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="text-sm font-semibold text-gray-500 uppercase tracking-tight">Reportes</p>
          <h2 class="text-2xl font-semibold text-gray-900">Generador ejecutivo</h2>
          <p class="text-sm text-gray-500">Descarga reportes consolidados con los filtros deseados.</p>
        </div>
        <span class="text-sm text-gray-500">{{ plantillas().length }} plantillas disponibles</span>
      </div>
      <form class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4" [formGroup]="form" (ngSubmit)="generarReporte()">
        <label class="field">
          <span>Tipo de reporte</span>
          <select class="input" formControlName="plantilla" [disabled]="plantillas().length === 0">
            <option [ngValue]="null" disabled>Selecciona una opción</option>
            @for (plantilla of plantillas(); track plantilla) {
              <option [ngValue]="plantilla.id">{{ plantilla.nombre }}</option>
            }
          </select>
        </label>
        <label class="field">
          <span>Formato</span>
          <select class="input" formControlName="formato" [disabled]="!plantillaSeleccionada()">
            @for (formato of formatosDisponibles(); track formato) {
              <option [value]="formato">{{ formato | uppercase }}</option>
            }
          </select>
        </label>
        <label class="field">
          <span>Fecha inicio</span>
          <input class="input" type="date" formControlName="fechaInicio">
        </label>
        <label class="field">
          <span>Fecha fin</span>
          <input class="input" type="date" formControlName="fechaFin">
        </label>
        <label class="field md:col-span-2">
          <span class="flex items-center gap-2">
            <input type="checkbox" formControlName="incluirDetalles" class="accent-indigo-600">
            Incluir detalles de movimientos
          </span>
        </label>
        <div class="md:col-span-2 flex flex-wrap gap-3">
          <button type="submit" class="btn-primary" [disabled]="generando() || plantillas().length === 0">
            {{ generando() ? 'Generando...' : 'Generar y exportar' }}
          </button>
          <button type="button" class="btn-secondary" (click)="limpiarFechas()">
            Limpiar fechas
          </button>
        </div>
      </form>
      @if (exportError()) {
        <div class="alert-error">
          {{ exportError() }}
        </div>
      }
    </section>
  }
</div>
  `,
  styles: [`
.stat-card {
	@apply rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-2;
}

.stat-label {
	@apply text-sm text-gray-500 uppercase tracking-tight font-semibold;
}

.stat-value {
	@apply text-3xl font-bold text-gray-900;
}

.stat-variation {
	@apply text-xs font-semibold;
}

.panel {
	@apply rounded-2xl border border-gray-100 bg-white p-6 shadow-sm;
}

.skeleton {
	@apply rounded-2xl bg-gray-100 animate-pulse;
}

.btn-primary {
	@apply inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50;
}

.btn-secondary {
	@apply inline-flex items-center justify-center rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-gray-300 disabled:opacity-50;
}

.input {
	@apply w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100;
}

.field {
	@apply text-sm text-gray-600 space-y-1;
}

.badge {
	@apply inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700;
}

.alert-card {
	@apply flex items-start justify-between gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-4;
}

.alert-error {
	@apply rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700;
}

.chip {
	@apply inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold;
}

.empty-state {
	@apply rounded-2xl border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500;
}

  `],
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
