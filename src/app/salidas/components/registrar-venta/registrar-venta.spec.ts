import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { RegistrarVenta } from './registrar-venta.component';
import { InventarioService } from '../../../core/services/inventario.service';
import { VentasService } from '../../../core/services/ventas.service';
import { NotificacionesService } from '../../../core/services/notificaciones.service';
import { ClientesService } from '../../../core/services/clientes.service';
import { Cliente } from '../../../core/models/cliente';

describe('RegistrarVenta', () => {
  let component: RegistrarVenta;
  let fixture: ComponentFixture<RegistrarVenta>;
  let inventarioService: jasmine.SpyObj<InventarioService>;
  let ventasService: jasmine.SpyObj<VentasService>;
  let notificacionesService: jasmine.SpyObj<NotificacionesService>;
  let clientesService: jasmine.SpyObj<ClientesService>;

  const inventarioMock = [{
    id: 1,
    codigo: 'CMP-001',
    nombre: 'Tarjeta Madre',
    categoria: 'Componentes',
    stockActual: 5,
    precioUnitario: 120000,
    estado: 'Disponible'
  }];

  const clientesMock: Cliente[] = [
    {
      id: 7,
      nombre: 'María López',
      correo: 'maria@example.com',
      telefono: '7000-0000',
      categoria: 'Frecuente'
    }
  ];

  beforeEach(async () => {
    inventarioService = jasmine.createSpyObj('InventarioService', ['obtenerInventario']);
    ventasService = jasmine.createSpyObj('VentasService', ['registrarVenta']);
    notificacionesService = jasmine.createSpyObj('NotificacionesService', ['info', 'error', 'exito']);
    clientesService = jasmine.createSpyObj('ClientesService', ['obtenerClientes']);

    inventarioService.obtenerInventario.and.returnValue(of(inventarioMock as any));
    ventasService.registrarVenta.and.returnValue(of({ id: 10 } as any));
    clientesService.obtenerClientes.and.returnValue(of(clientesMock));

    await TestBed.configureTestingModule({
      imports: [RegistrarVenta],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        { provide: InventarioService, useValue: inventarioService },
        { provide: VentasService, useValue: ventasService },
        { provide: NotificacionesService, useValue: notificacionesService },
        { provide: ClientesService, useValue: clientesService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RegistrarVenta);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(inventarioService.obtenerInventario).toHaveBeenCalled();
    expect(clientesService.obtenerClientes).toHaveBeenCalled();
  });

  it('should add product to the order when selected', () => {
    component.seleccionarProducto(inventarioMock[0] as any);
    expect(component.lineas().length).toBe(1);
    expect(component.resumen().articulos).toBe(1);
  });

  it('should call registrarVenta when payload is valid', () => {
    component.lineas.set([
      {
        id: 'linea-1',
        productoId: 1,
        codigo: 'CMP-001',
        nombre: 'Tarjeta Madre',
        stockActual: 5,
        cantidad: 2,
        precioUnitario: 1000
      }
    ] as any);
    component.cliente.set('Cliente Demo');
    component.metodoPago.set('Efectivo');

    component.registrarVenta();

    expect(ventasService.registrarVenta).toHaveBeenCalledWith({
      clienteId: null,
      cliente: 'Cliente Demo',
      metodoPago: 'Efectivo',
      vendedor: null,
      observaciones: null,
      detalles: [
        {
          productoId: 1,
          cantidad: 2,
          precioUnitario: 1000
        }
      ]
    });
    expect(notificacionesService.exito).toHaveBeenCalled();
  });

  it('should surface errors when registrarVenta fails', () => {
    ventasService.registrarVenta.and.returnValue(throwError(() => new Error('fail')));
    component.lineas.set([
      {
        id: 'linea-1',
        productoId: 1,
        codigo: 'CMP-001',
        nombre: 'Tarjeta Madre',
        stockActual: 5,
        cantidad: 1,
        precioUnitario: 1000
      }
    ] as any);
    component.cliente.set('Cliente Demo');

    component.registrarVenta();

    expect(notificacionesService.error).toHaveBeenCalled();
  });

  it('should include clienteId when a registered client is selected', () => {
    component.seleccionarCliente(clientesMock[0]);
    component.lineas.set([
      {
        id: 'linea-1',
        productoId: 1,
        codigo: 'CMP-001',
        nombre: 'Tarjeta Madre',
        stockActual: 5,
        cantidad: 1,
        precioUnitario: 1000
      }
    ] as any);

    component.registrarVenta();

    expect(ventasService.registrarVenta).toHaveBeenCalledWith(jasmine.objectContaining({
      clienteId: 7,
      cliente: 'María López'
    }));
  });
});
