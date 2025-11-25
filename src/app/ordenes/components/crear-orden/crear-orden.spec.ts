import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { CrearOrden } from './crear-orden.component';
import { ClientesService } from '../../../core/services/clientes.service';
import { TecnicosService } from '../../../core/services/tecnicos.service';
import { OrdenesService } from '../../../core/services/ordenes.service';
import { NotificacionesService } from '../../../core/services/notificaciones.service';
import { Cliente } from '../../../core/models/cliente';
import { Tecnico } from '../../../core/models/tecnico';
import { OrdenTrabajo } from '../../../core/models/orden';

describe('CrearOrden', () => {
  let component: CrearOrden;
  let fixture: ComponentFixture<CrearOrden>;
  let clientesService: jasmine.SpyObj<ClientesService>;
  let tecnicosService: jasmine.SpyObj<TecnicosService>;
  let ordenesService: jasmine.SpyObj<OrdenesService>;
  let notificaciones: jasmine.SpyObj<NotificacionesService>;

  const clientesMock: Cliente[] = [
    { id: 1, nombre: 'Carlos Rodríguez', correo: 'carlos@example.com', categoria: 'Frecuente' }
  ];

  const tecnicosMock: Tecnico[] = [{ id: 10, nombre: 'Jackson Medina', especialidad: 'Mantenimiento' }];

  const ordenCreada: OrdenTrabajo = {
    id: 50,
    codigo: 'ORD-050',
    tipo: 'Ensamble',
    clienteId: 1,
    clienteNombre: 'Carlos Rodríguez',
    descripcion: 'PC gamer',
    estado: 'Registrada',
    prioridad: 'Alta'
  };

  beforeEach(async () => {
    clientesService = jasmine.createSpyObj('ClientesService', ['obtenerClientes']);
    tecnicosService = jasmine.createSpyObj('TecnicosService', ['obtenerTecnicos']);
    ordenesService = jasmine.createSpyObj('OrdenesService', ['crearOrden']);
    notificaciones = jasmine.createSpyObj('NotificacionesService', ['exito', 'error']);

    clientesService.obtenerClientes.and.returnValue(of(clientesMock));
    tecnicosService.obtenerTecnicos.and.returnValue(of(tecnicosMock));
    ordenesService.crearOrden.and.returnValue(of(ordenCreada));

    await TestBed.configureTestingModule({
      imports: [CrearOrden],
      providers: [
        provideRouter([]),
        { provide: ClientesService, useValue: clientesService },
        { provide: TecnicosService, useValue: tecnicosService },
        { provide: OrdenesService, useValue: ordenesService },
        { provide: NotificacionesService, useValue: notificaciones }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CrearOrden);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('carga clientes y técnicos al iniciar', () => {
    expect(clientesService.obtenerClientes).toHaveBeenCalled();
    expect(tecnicosService.obtenerTecnicos).toHaveBeenCalled();
    expect(component.clientes().length).toBe(1);
    expect(component.tecnicos().length).toBe(1);
  });

  it('envía el payload correcto al registrar la orden', () => {
    component.seleccionarCliente('1');
    component.actualizarDescripcion('Instalar componentes de cliente');
    component.actualizarPrioridad('Alta');
    component.seleccionarTecnico('10');

    component.registrarOrden();

    expect(ordenesService.crearOrden).toHaveBeenCalledWith({
      tipo: 'Ensamble',
      clienteId: 1,
      descripcion: 'Instalar componentes de cliente',
      prioridad: 'Alta',
      tecnicoId: 10,
      canal: 'Mostrador',
      observaciones: null
    });
    expect(notificaciones.exito).toHaveBeenCalled();
  });
});
