import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ListaVentas } from './lista-ventas';
import { VentasService } from '../../../core/services/ventas.service';
import { NotificacionesService } from '../../../core/services/notificaciones.service';

describe('ListaVentas', () => {
  let component: ListaVentas;
  let fixture: ComponentFixture<ListaVentas>;
  let ventasService: jasmine.SpyObj<VentasService>;

  beforeEach(async () => {
    ventasService = jasmine.createSpyObj('VentasService', ['obtenerVentas']);
    const notificacionesService = jasmine.createSpyObj('NotificacionesService', ['info', 'error', 'exito']);
    ventasService.obtenerVentas.and.returnValue(of([
      {
        id: 1,
        codigo: 'FAC-001',
        cliente: 'Carlos Rodríguez',
        fecha: new Date().toISOString(),
        estado: 'Pagada',
        montoTotal: 1250000,
        metodoPago: 'Tarjeta'
      }
    ]));

    await TestBed.configureTestingModule({
      imports: [ListaVentas],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: VentasService, useValue: ventasService },
        { provide: NotificacionesService, useValue: notificacionesService }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListaVentas);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load sales on init', () => {
    expect(ventasService.obtenerVentas).toHaveBeenCalled();
    expect(component.ventas().length).toBeGreaterThan(0);
  });
});
