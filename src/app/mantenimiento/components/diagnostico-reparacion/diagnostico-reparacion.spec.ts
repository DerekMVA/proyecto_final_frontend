import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { DiagnosticoReparacion } from './diagnostico-reparacion.component';
import { MantenimientoService } from '../../../core/services/mantenimiento.service';
import { NotificacionesService } from '../../../core/services/notificaciones.service';
import { TicketMantenimiento } from '../../../core/models/mantenimiento';

describe('DiagnosticoReparacion', () => {
  let component: DiagnosticoReparacion;
  let fixture: ComponentFixture<DiagnosticoReparacion>;
  let mantenimientoService: jasmine.SpyObj<MantenimientoService>;
  let notificaciones: jasmine.SpyObj<NotificacionesService>;

  const ticketMock: TicketMantenimiento = {
    id: 10,
    codigo: 'GAR-010',
    equipo: 'Laptop Lenovo',
    cliente: 'Ana Duarte',
    prioridad: 'Alta',
    estado: 'En diagnóstico'
  };

  beforeEach(async () => {
    mantenimientoService = jasmine.createSpyObj('MantenimientoService', ['obtenerTicketPorId', 'registrarReparacion']);
    notificaciones = jasmine.createSpyObj('NotificacionesService', ['info', 'exito', 'error']);

    mantenimientoService.obtenerTicketPorId.and.returnValue(of(ticketMock));
    mantenimientoService.registrarReparacion.and.returnValue(of({ ...ticketMock, diagnosticoTecnico: 'Actualizado' }));

    await TestBed.configureTestingModule({
      imports: [DiagnosticoReparacion],
      providers: [
        { provide: MantenimientoService, useValue: mantenimientoService },
        { provide: NotificacionesService, useValue: notificaciones },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: of(convertToParamMap({ ticket: `${ticketMock.id}` }))
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DiagnosticoReparacion);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('carga el ticket indicado en los parámetros', () => {
    expect(mantenimientoService.obtenerTicketPorId).toHaveBeenCalledWith(ticketMock.id);
    expect(component.ticket()).toEqual(ticketMock);
  });

  it('envía el payload de reparación cuando se registra el diagnóstico', () => {
    component.ticket.set(ticketMock);
    component.diagnosticoTecnico.set('Placa madre dañada');
    component.accionesRealizadas.set('Pruebas eléctricas');
    component.piezasTexto.set('Mainboard\nCable flex');
    component.tiempoHoras.set('2.5');
    component.costoEstimado.set('45000');

    component.registrarReparacion();

    expect(mantenimientoService.registrarReparacion).toHaveBeenCalledWith(ticketMock.id, {
      diagnostico: 'Placa madre dañada',
      accionesRealizadas: 'Pruebas eléctricas',
      piezasUtilizadas: ['Mainboard', 'Cable flex'],
      tiempoEmpleadoHoras: 2.5,
      costoEstimado: 45000
    });
    expect(notificaciones.exito).toHaveBeenCalled();
  });
});
