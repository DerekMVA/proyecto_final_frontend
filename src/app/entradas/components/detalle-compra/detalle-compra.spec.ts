import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { DetalleCompra } from './detalle-compra.component';
import { ComprasService } from '../../../core/services/compras.service';
import { NotificacionesService } from '../../../core/services/notificaciones.service';
import { ProveedoresService } from '../../../core/services/proveedores.service';
import { Compra } from '../../../core/models/compra';
import { Proveedor } from '../../../core/models/proveedor';

describe('DetalleCompra', () => {
  let fixture: ComponentFixture<DetalleCompra>;
  let component: DetalleCompra;
  let comprasService: jasmine.SpyObj<ComprasService>;
  let proveedoresService: jasmine.SpyObj<ProveedoresService>;
  let notificacionesService: jasmine.SpyObj<NotificacionesService>;
  let paramMap$: Subject<ReturnType<typeof convertToParamMap>>;

  const compraMock: Compra = {
    id: 5,
    idProveedor: 12,
    codigo: 'CMP-005',
    proveedor: 'ElectroComponentes S.A.',
    fecha: '2024-06-01T10:00:00Z',
    montoTotal: 250000,
    estado: 'Pendiente',
    observaciones: 'Entregar en recepción',
    detalles: [
      {
        id: 1,
        producto: 'Tarjeta madre',
        cantidad: 3,
        precioUnitario: 50000,
        total: 150000
      },
      {
        id: 2,
        descripcion: 'Cables SATA',
        cantidad: 5,
        precioUnitario: 20000,
        total: 100000
      }
    ]
  };

  const proveedorMock: Proveedor = {
    id: 12,
    nombre: 'ElectroComponentes S.A.',
    contacto: 'Laura Salas',
    telefono: '8888-1234',
    correo: 'compras@electro.com',
    direccion: 'San José, CR'
  };

  beforeEach(async () => {
    comprasService = jasmine.createSpyObj<ComprasService>('ComprasService', ['obtenerCompraPorId', 'actualizarEstadoCompra']);
    proveedoresService = jasmine.createSpyObj<ProveedoresService>('ProveedoresService', ['obtenerProveedorPorId']);
    notificacionesService = jasmine.createSpyObj<NotificacionesService>('NotificacionesService', ['info', 'error', 'exito']);

    comprasService.obtenerCompraPorId.and.returnValue(of(compraMock));
    proveedoresService.obtenerProveedorPorId.and.returnValue(of(proveedorMock));

    paramMap$ = new Subject();

    await TestBed.configureTestingModule({
      imports: [DetalleCompra],
      providers: [
        provideRouter([]),
        { provide: ComprasService, useValue: comprasService },
        { provide: ProveedoresService, useValue: proveedoresService },
        { provide: NotificacionesService, useValue: notificacionesService },
        { provide: ActivatedRoute, useValue: { paramMap: paramMap$.asObservable() } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DetalleCompra);
    component = fixture.componentInstance;
  });

  function emitirRuta(id: string): void {
    paramMap$.next(convertToParamMap({ id }));
    fixture.detectChanges();
  }

  it('should load purchase and provider details on init', () => {
    emitirRuta('5');

    expect(comprasService.obtenerCompraPorId).toHaveBeenCalledWith(5);
    expect(component.compra()).toEqual(compraMock);
    expect(component.proveedor()).toEqual(proveedorMock);
    expect(notificacionesService.info).toHaveBeenCalledWith('Detalle de la compra CMP-005 cargado.');
  });

  it('should surface errors when compra loading fails', () => {
    comprasService.obtenerCompraPorId.and.returnValue(throwError(() => new Error('fail')));

    emitirRuta('5');

    expect(component.error()).toBe('No se pudo obtener el detalle de la compra. Intenta nuevamente.');
    expect(notificacionesService.error).toHaveBeenCalledWith('No se pudo cargar el detalle de la compra.');
    expect(component.loading()).toBeFalse();
  });

  it('should update estado when cambiarEstado is called', () => {
    emitirRuta('5');

    const compraActualizada: Compra = { ...compraMock, estado: 'Completada' };
    comprasService.actualizarEstadoCompra.and.returnValue(of(compraActualizada));

    component.cambiarEstado('Completada');

    expect(comprasService.actualizarEstadoCompra).toHaveBeenCalledWith(5, 'Completada');
    expect(component.compra()).toEqual(compraActualizada);
    expect(notificacionesService.exito).toHaveBeenCalledWith('Compra CMP-005 actualizada a Completada.');
  });

  it('should handle provider fetch errors gracefully', () => {
    proveedoresService.obtenerProveedorPorId.and.returnValue(throwError(() => new Error('provider fail')));

    emitirRuta('5');

    expect(component.proveedorError()).toBe('No se pudo obtener la información del proveedor.');
    expect(notificacionesService.error).toHaveBeenCalledWith('No se pudo cargar la información del proveedor.');
    expect(component.proveedorCargando()).toBeFalse();
  });

  it('should mark route errors when id is invalid', () => {
    emitirRuta('abc');

    expect(component.error()).toBe('El identificador de la compra no es numérico.');
    expect(comprasService.obtenerCompraPorId).not.toHaveBeenCalled();
  });
});
