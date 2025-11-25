import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { DashboardReportes } from './dashboard-reportes.component';
import { ReportesService } from '../../../core/services/reportes.service';
import { NotificacionesService } from '../../../core/services/notificaciones.service';
import {
  AlertaAdministrativa,
  ReportePlantilla,
  ResumenAdministrativo,
  TendenciaAdministrativa
} from '../../../core/models/reporte';

describe('DashboardReportes', () => {
  let component: DashboardReportes;
  let fixture: ComponentFixture<DashboardReportes>;
  let reportesService: jasmine.SpyObj<ReportesService>;
  let notificaciones: jasmine.SpyObj<NotificacionesService>;

  const resumenMock: ResumenAdministrativo = {
    ventasMes: 1500000,
    variacionVentas: 4.5,
    ordenesActivas: 18,
    variacionOrdenes: -2,
    productosBajoStock: 7,
    variacionStock: 1.2,
    nuevosClientes: 12,
    variacionClientes: 3.1,
    fechaCorte: '2024-05-01T00:00:00Z'
  };

  const alertasMock: AlertaAdministrativa[] = [
    { id: 1, tipo: 'Stock crítico', modulo: 'Inventario', mensaje: 'Baterías en nivel mínimo', criticidad: 'alta', fecha: '2024-05-10T12:00:00Z' }
  ];

  const plantillasMock: ReportePlantilla[] = [
    { id: 'ventas', nombre: 'Reporte de ventas', descripcion: 'Detalle mensual', formatos: ['pdf', 'xlsx'], requiereFechas: true }
  ];

  const tendenciasMock: TendenciaAdministrativa[] = [
    { periodo: 'Abr 2024', ventas: 120, ordenes: 40, ingresos: 950000, egresos: 250000 }
  ];

  beforeEach(async () => {
    reportesService = jasmine.createSpyObj('ReportesService', [
      'obtenerResumen',
      'obtenerAlertas',
      'obtenerPlantillas',
      'obtenerTendencias',
      'exportarReporte'
    ]);
    notificaciones = jasmine.createSpyObj('NotificacionesService', ['info', 'exito', 'error']);

    reportesService.obtenerResumen.and.returnValue(of(resumenMock));
    reportesService.obtenerAlertas.and.returnValue(of(alertasMock));
    reportesService.obtenerPlantillas.and.returnValue(of(plantillasMock));
    reportesService.obtenerTendencias.and.returnValue(of(tendenciasMock));
    reportesService.exportarReporte.and.returnValue(of(new Blob(['data'], { type: 'application/pdf' })));

    await TestBed.configureTestingModule({
      imports: [DashboardReportes],
      providers: [
        provideRouter([]),
        { provide: ReportesService, useValue: reportesService },
        { provide: NotificacionesService, useValue: notificaciones }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardReportes);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('carga el panel administrativo al iniciar', () => {
    expect(reportesService.obtenerResumen).toHaveBeenCalled();
    expect(reportesService.obtenerAlertas).toHaveBeenCalled();
    expect(reportesService.obtenerPlantillas).toHaveBeenCalled();
    expect(reportesService.obtenerTendencias).toHaveBeenCalled();
    expect(component.resumen()).toEqual(resumenMock);
    expect(component.alertas().length).toBe(1);
    expect(component.plantillas().length).toBe(1);
  });

  it('recarga las tendencias al cambiar de periodo', () => {
    reportesService.obtenerTendencias.calls.reset();
    reportesService.obtenerTendencias.and.returnValue(of(tendenciasMock));

    component.cambiarPeriodo('trimestral');

    expect(reportesService.obtenerTendencias).toHaveBeenCalledTimes(1);
    expect(reportesService.obtenerTendencias).toHaveBeenCalledWith('trimestral');
  });

  it('envía la solicitud de exportación cuando el formulario es válido', () => {
    spyOn(URL, 'createObjectURL').and.returnValue('blob:reporte');
    spyOn(URL, 'revokeObjectURL');

    component.form.patchValue({
      plantilla: plantillasMock[0].id,
      formato: 'pdf',
      fechaInicio: '2024-05-01',
      fechaFin: '2024-05-31',
      incluirDetalles: true
    });

    component.generarReporte();

    expect(reportesService.exportarReporte).toHaveBeenCalledWith({
      idPlantilla: 'ventas',
      formato: 'pdf',
      fechaInicio: '2024-05-01',
      fechaFin: '2024-05-31',
      incluirDetalles: true
    });
    expect(notificaciones.exito).toHaveBeenCalled();
  });
});
