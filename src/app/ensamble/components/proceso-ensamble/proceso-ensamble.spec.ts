import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ProcesoEnsamble } from './proceso-ensamble.component';
import { EnsambleService } from '../../../core/services/ensamble.service';
import { NotificacionesService } from '../../../core/services/notificaciones.service';
import { OrdenEnsamble } from '../../../core/models/ensamble';

describe('ProcesoEnsamble', () => {
  let component: ProcesoEnsamble;
  let fixture: ComponentFixture<ProcesoEnsamble>;
  let ensambleService: jasmine.SpyObj<EnsambleService>;
  let notificaciones: jasmine.SpyObj<NotificacionesService>;

  const ordenMock: OrdenEnsamble = {
    id: 5,
    codigo: 'ENS-005',
    descripcion: 'Workstation',
    cliente: 'ACME Corp',
    prioridad: 'Alta',
    estado: 'Pendiente',
    componentes: [
      { id: 101, nombre: 'CPU', requerido: true, instalado: false },
      { id: 102, nombre: 'RAM', requerido: true, instalado: false }
    ]
  };

  beforeEach(async () => {
    ensambleService = jasmine.createSpyObj('EnsambleService', ['obtenerOrdenPorId', 'registrarAvance']);
    notificaciones = jasmine.createSpyObj('NotificacionesService', ['info', 'error', 'exito']);

    ensambleService.obtenerOrdenPorId.and.returnValue(of(ordenMock));
    ensambleService.registrarAvance.and.returnValue(of({ ...ordenMock, estado: 'Completado' }));

    await TestBed.configureTestingModule({
      imports: [ProcesoEnsamble],
      providers: [
        provideRouter([]),
        { provide: EnsambleService, useValue: ensambleService },
        { provide: NotificacionesService, useValue: notificaciones },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: of(convertToParamMap({ orden: `${ordenMock.id}` }))
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProcesoEnsamble);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('carga la orden indicada en los parámetros', () => {
    expect(ensambleService.obtenerOrdenPorId).toHaveBeenCalledWith(ordenMock.id);
    expect(component.orden()).toEqual(ordenMock);
  });

  it('registra el avance enviando los componentes completados', () => {
    component.componentes.set([
      { id: 101, nombre: 'CPU', requerido: true, instalado: true },
      { id: 102, nombre: 'RAM', requerido: true, instalado: true }
    ]);
    component.notas.set('Notas de prueba');
    component.pruebas.set('Pruebas térmicas');
    component.tiempoHoras.set('2.5');

    component.registrarAvance(true);

    expect(ensambleService.registrarAvance).toHaveBeenCalledWith(ordenMock.id, {
      componentesCompletados: [101, 102],
      notas: 'Notas de prueba',
      pruebasRealizadas: 'Pruebas térmicas',
      tiempoEmpleadoHoras: 2.5,
      estadoObjetivo: 'Completado'
    });
    expect(notificaciones.exito).toHaveBeenCalled();
  });
});
