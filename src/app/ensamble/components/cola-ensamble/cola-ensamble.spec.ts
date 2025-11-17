import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ColaEnsamble } from './cola-ensamble';
import { EnsambleService } from '../../../core/services/ensamble.service';
import { NotificacionesService } from '../../../core/services/notificaciones.service';
import { OrdenEnsamble } from '../../../core/models/ensamble';

describe('ColaEnsamble', () => {
  let component: ColaEnsamble;
  let fixture: ComponentFixture<ColaEnsamble>;
  let ensambleService: jasmine.SpyObj<EnsambleService>;
  let notificaciones: jasmine.SpyObj<NotificacionesService>;

  const ordenMock: OrdenEnsamble = {
    id: 1,
    codigo: 'ENS-001',
    descripcion: 'PC Gamer',
    cliente: 'Carlos Rodríguez',
    prioridad: 'Alta',
    estado: 'Pendiente',
    componentes: [
      { id: 11, nombre: 'CPU', requerido: true, instalado: false },
      { id: 12, nombre: 'GPU', requerido: true, instalado: true }
    ]
  };

  beforeEach(async () => {
    ensambleService = jasmine.createSpyObj('EnsambleService', ['obtenerCola', 'actualizarEstado']);
    notificaciones = jasmine.createSpyObj('NotificacionesService', ['info', 'error']);

    ensambleService.obtenerCola.and.returnValue(of([ordenMock]));
    ensambleService.actualizarEstado.and.returnValue(of({ ...ordenMock, estado: 'En progreso' }));

    await TestBed.configureTestingModule({
      imports: [ColaEnsamble],
      providers: [
        provideRouter([]),
        { provide: EnsambleService, useValue: ensambleService },
        { provide: NotificacionesService, useValue: notificaciones }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ColaEnsamble);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('carga la cola de ensambles al inicializarse', () => {
    expect(ensambleService.obtenerCola).toHaveBeenCalled();
    expect(component.cola().length).toBe(1);
    expect(component.cola()[0].codigo).toBe('ENS-001');
  });

  it('actualiza el estado de una orden cuando se inicia', () => {
    component.iniciarOrden(component.cola()[0]);
    expect(ensambleService.actualizarEstado).toHaveBeenCalledWith(ordenMock.id, { estado: 'En progreso' });
  });
});
