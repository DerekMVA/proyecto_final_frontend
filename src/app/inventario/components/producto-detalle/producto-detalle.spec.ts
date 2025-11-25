import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ProductoDetalle } from './producto-detalle.component';
import { InventarioService } from '../../../core/services/inventario.service';
import { NotificacionesService } from '../../../core/services/notificaciones.service';

describe('ProductoDetalle', () => {
  let component: ProductoDetalle;
  let fixture: ComponentFixture<ProductoDetalle>;
  let inventarioService: jasmine.SpyObj<InventarioService>;

  beforeEach(async () => {
    inventarioService = jasmine.createSpyObj('InventarioService', ['obtenerProductoPorId']);
    const notificacionesService = jasmine.createSpyObj('NotificacionesService', ['info', 'error']);
    inventarioService.obtenerProductoPorId.and.returnValue(of({
      id: 1,
      codigo: 'CMP-001',
      nombre: 'Procesador Ryzen 5',
      categoria: 'Componentes',
      estado: 'Disponible',
      stockActual: 10,
      stockMinimo: 3,
      stockMaximo: 50,
      precioUnitario: 150000,
      ubicacion: 'Bodega 1',
      actualizado: new Date().toISOString()
    }));

    await TestBed.configureTestingModule({
      imports: [ProductoDetalle],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: InventarioService, useValue: inventarioService },
        { provide: NotificacionesService, useValue: notificacionesService },
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: '1' })) } }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProductoDetalle);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should request detail on init', () => {
    expect(inventarioService.obtenerProductoPorId).toHaveBeenCalled();
  });
});
