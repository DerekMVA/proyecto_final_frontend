import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AjusteInventario } from './ajuste-inventario';
import { InventarioService } from '../../../core/services/inventario.service';
import { NotificacionesService } from '../../../core/services/notificaciones.service';

describe('AjusteInventario', () => {
  let component: AjusteInventario;
  let fixture: ComponentFixture<AjusteInventario>;
  let inventarioService: jasmine.SpyObj<InventarioService>;
  const mockProducto = {
    id: 1,
    codigo: 'CMP-001',
    nombre: 'Procesador Ryzen 5',
    categoria: 'Componentes',
    estado: 'Disponible',
    stockActual: 10,
    stockMinimo: 2,
    stockMaximo: 30,
    precioUnitario: 150000,
    ubicacion: 'Bodega 1'
  };

  beforeEach(async () => {
    inventarioService = jasmine.createSpyObj('InventarioService', ['obtenerInventario', 'registrarAjuste']);
    const notificacionesService = jasmine.createSpyObj('NotificacionesService', ['info', 'error', 'exito']);
    inventarioService.obtenerInventario.and.returnValue(of([mockProducto]));
    inventarioService.registrarAjuste.and.returnValue(of({ ...mockProducto, stockActual: 20 }));

    await TestBed.configureTestingModule({
      imports: [AjusteInventario],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: InventarioService, useValue: inventarioService },
        { provide: NotificacionesService, useValue: notificacionesService }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AjusteInventario);
    component = fixture.componentInstance;
    fixture.detectChanges();
    component.inventario.set([mockProducto]);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should submit adjustment with selected product', () => {
    component.seleccionarProducto(mockProducto);
    component.form.patchValue({ nuevaCantidad: 20, motivo: 'Conteo físico' });
    component.enviar();
    expect(inventarioService.registrarAjuste).toHaveBeenCalled();
  });
});
