import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { GestionClientes } from './gestion-clientes';
import { ClientesService } from '../../../core/services/clientes.service';
import { NotificacionesService } from '../../../core/services/notificaciones.service';

describe('GestionClientes', () => {
  let component: GestionClientes;
  let fixture: ComponentFixture<GestionClientes>;
  let clientesService: jasmine.SpyObj<ClientesService>;
  let notificaciones: jasmine.SpyObj<NotificacionesService>;

  const clientesMock = [
    {
      id: 1,
      nombre: 'Cliente Demo',
      correo: 'demo@correo.com',
      telefono: '8888-0000',
      categoria: 'Frecuente',
      fechaRegistro: new Date().toISOString(),
      comprasUltimoMes: 3,
      montoAcumulado: 250000
    }
  ];

  beforeEach(async () => {
    clientesService = jasmine.createSpyObj('ClientesService', ['obtenerClientes', 'registrarCliente']);
    notificaciones = jasmine.createSpyObj('NotificacionesService', ['info', 'error', 'exito']);

    clientesService.obtenerClientes.and.returnValue(of(clientesMock as any));
    clientesService.registrarCliente.and.returnValue(of({ ...clientesMock[0], id: 2 } as any));

    await TestBed.configureTestingModule({
      imports: [GestionClientes],
      providers: [
        provideRouter([]),
        { provide: ClientesService, useValue: clientesService },
        { provide: NotificacionesService, useValue: notificaciones }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GestionClientes);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load clientes', () => {
    expect(component).toBeTruthy();
    expect(clientesService.obtenerClientes).toHaveBeenCalled();
    expect(component.clientes().length).toBe(1);
  });

  it('should register a client when form is valid', () => {
    component.formularioNuevo.set({
      nombre: 'Nuevo Cliente',
      correo: 'nuevo@correo.com',
      telefono: '8888-9999',
      categoria: 'Premium',
      ubicacion: 'San José'
    });

    component.registrarCliente();

    expect(clientesService.registrarCliente).toHaveBeenCalled();
    expect(notificaciones.exito).toHaveBeenCalled();
    expect(component.clientes().length).toBe(2);
  });

  it('should surface service errors on register', () => {
    clientesService.registrarCliente.and.returnValue(throwError(() => new Error('fail')));
    component.formularioNuevo.set({
      nombre: 'Fallo',
      correo: 'fallo@correo.com',
      telefono: '',
      categoria: 'Frecuente',
      ubicacion: ''
    });

    component.registrarCliente();

    expect(notificaciones.error).toHaveBeenCalled();
  });
});
