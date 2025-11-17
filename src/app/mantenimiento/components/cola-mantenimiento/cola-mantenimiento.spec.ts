import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ColaMantenimiento } from './cola-mantenimiento';
import { MantenimientoService } from '../../../core/services/mantenimiento.service';
import { NotificacionesService } from '../../../core/services/notificaciones.service';

describe('ColaMantenimiento', () => {
  let component: ColaMantenimiento;
  let fixture: ComponentFixture<ColaMantenimiento>;
  let mantenimientoService: jasmine.SpyObj<MantenimientoService>;
  let notificaciones: jasmine.SpyObj<NotificacionesService>;

  const ticketsMock = [
    {
      id: 1,
      codigo: 'MT-001',
      equipo: 'Laptop X',
      cliente: 'Cliente Demo',
      prioridad: 'Alta',
      estado: 'En diagnóstico',
      tipoServicio: 'Garantía',
      diagnostico: 'No enciende',
      tecnicoAsignado: null,
      ingreso: new Date().toISOString(),
      entregaEstimada: new Date().toISOString(),
      progreso: 10,
      tiempoEnColaHoras: 5,
      observaciones: null
    }
  ];

  beforeEach(async () => {
    mantenimientoService = jasmine.createSpyObj('MantenimientoService', ['obtenerColaMantenimiento', 'actualizarEstadoTicket', 'asignarTecnico']);
    notificaciones = jasmine.createSpyObj('NotificacionesService', ['info', 'error', 'exito']);

    mantenimientoService.obtenerColaMantenimiento.and.returnValue(of(ticketsMock as any));
    mantenimientoService.actualizarEstadoTicket.and.returnValue(of({ ...ticketsMock[0], estado: 'Listo' } as any));
    mantenimientoService.asignarTecnico.and.returnValue(of({ ...ticketsMock[0], tecnicoAsignado: 'Laura' } as any));

    await TestBed.configureTestingModule({
      imports: [ColaMantenimiento],
      providers: [
        provideRouter([]),
        { provide: MantenimientoService, useValue: mantenimientoService },
        { provide: NotificacionesService, useValue: notificaciones }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ColaMantenimiento);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load queue', () => {
    expect(component).toBeTruthy();
    expect(mantenimientoService.obtenerColaMantenimiento).toHaveBeenCalled();
    expect(component.cola().length).toBe(1);
  });

  it('should update ticket state via service', () => {
    component.actualizarEstadoTicket(ticketsMock[0] as any, 'Listo');
    expect(mantenimientoService.actualizarEstadoTicket).toHaveBeenCalledWith(1, { estado: 'Listo' });
  });

  it('should assign technician when prompt returns value', () => {
    spyOn(window, 'prompt').and.returnValue('Laura');
    component.asignarTecnico(ticketsMock[0] as any);
    expect(mantenimientoService.asignarTecnico).toHaveBeenCalledWith(1, { tecnico: 'Laura' });
  });
});
