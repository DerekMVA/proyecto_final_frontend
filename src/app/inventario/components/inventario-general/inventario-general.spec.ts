import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { InventarioGeneral } from './inventario-general';
import { InventarioService } from '../../../core/services/inventario.service';
import { NotificacionesService } from '../../../core/services/notificaciones.service';

const inventarioMock = [
  {
    id: 1,
    codigo: 'CMP-001',
    nombre: 'Procesador',
    categoria: 'Componentes',
    estado: 'Nuevo',
    stockActual: 10,
    precioUnitario: 100000,
    actualizado: new Date().toISOString()
  }
];

describe('InventarioGeneral', () => {
  let component: InventarioGeneral;
  let fixture: ComponentFixture<InventarioGeneral>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventarioGeneral],
      providers: [
        {
          provide: InventarioService,
          useValue: {
            obtenerInventario: jasmine.createSpy('obtenerInventario').and.returnValue(of(inventarioMock))
          }
        },
        {
          provide: NotificacionesService,
          useValue: {
            info: jasmine.createSpy('info'),
            error: jasmine.createSpy('error')
          }
        },
        provideRouter([])
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InventarioGeneral);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
