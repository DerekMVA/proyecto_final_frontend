import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ListaOrdenes } from './lista-ordenes';
import { OrdenesService } from '../../../core/services/ordenes.service';
import { NotificacionesService } from '../../../core/services/notificaciones.service';
import { OrdenTrabajo } from '../../../core/models/orden';

describe('ListaOrdenes', () => {
  let component: ListaOrdenes;
  let fixture: ComponentFixture<ListaOrdenes>;
  let ordenesService: jasmine.SpyObj<OrdenesService>;
  let notificaciones: jasmine.SpyObj<NotificacionesService>;

  const ordenesMock: OrdenTrabajo[] = [
    {
      id: 1,
      codigo: 'ORD-001',
      tipo: 'Ensamble',
      clienteId: 10,
      clienteNombre: 'Carlos Rodríguez',
      descripcion: 'PC gamer',
      estado: 'Registrada',
      prioridad: 'Alta',
      fechaCreacion: '2025-10-10T12:00:00Z'
    },
    {
      id: 2,
      codigo: 'ORD-002',
      tipo: 'Mantenimiento',
      clienteId: 11,
      clienteNombre: 'Ana Solano',
      descripcion: 'Laptop sin video',
      estado: 'En progreso',
      prioridad: 'Media',
      fechaCreacion: '2025-10-11T12:00:00Z'
    }
  ];

  beforeEach(async () => {
    ordenesService = jasmine.createSpyObj('OrdenesService', ['obtenerOrdenes']);
    notificaciones = jasmine.createSpyObj('NotificacionesService', ['info', 'error']);
    ordenesService.obtenerOrdenes.and.returnValue(of(ordenesMock));

    await TestBed.configureTestingModule({
      imports: [ListaOrdenes],
      providers: [provideRouter([]), { provide: OrdenesService, useValue: ordenesService }, { provide: NotificacionesService, useValue: notificaciones }]
    }).compileComponents();

    fixture = TestBed.createComponent(ListaOrdenes);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('carga la lista de órdenes al iniciar', () => {
    expect(ordenesService.obtenerOrdenes).toHaveBeenCalled();
    expect(component.ordenes().length).toBe(2);
    expect(component.resumen().total).toBe(2);
  });

  it('filtra por tipo de orden', () => {
    component.actualizarTipoFiltro('Ensamble');
    expect(component.ordenesFiltradas().length).toBe(1);
    expect(component.ordenesFiltradas()[0].codigo).toBe('ORD-001');
  });
});
