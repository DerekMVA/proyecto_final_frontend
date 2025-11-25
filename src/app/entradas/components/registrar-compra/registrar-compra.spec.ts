import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideRouter } from '@angular/router';
import { RegistrarCompra } from './registrar-compra.component';
import { ComprasService } from '../../../core/services/compras.service';
import { ProveedoresService } from '../../../core/services/proveedores.service';
import { NotificacionesService } from '../../../core/services/notificaciones.service';

describe('RegistrarCompra', () => {
  let component: RegistrarCompra;
  let fixture: ComponentFixture<RegistrarCompra>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegistrarCompra],
      providers: [
        provideRouter([]),
        {
          provide: ComprasService,
          useValue: {
            crearCompra: jasmine.createSpy('crearCompra').and.returnValue(of({}))
          }
        },
        {
          provide: ProveedoresService,
          useValue: {
            obtenerProveedores: jasmine.createSpy('obtenerProveedores').and.returnValue(of([])),
            crearProveedor: jasmine.createSpy('crearProveedor').and.returnValue(of({
              id: 1,
              nombre: 'Proveedor de prueba'
            }))
          }
        },
        {
          provide: NotificacionesService,
          useValue: {
            exito: jasmine.createSpy('exito'),
            error: jasmine.createSpy('error'),
            info: jasmine.createSpy('info')
          }
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegistrarCompra);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
