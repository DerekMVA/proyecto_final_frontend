import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { GestionProveedores } from './gestion-proveedores';

describe('GestionProveedores', () => {
  let component: GestionProveedores;
  let fixture: ComponentFixture<GestionProveedores>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionProveedores, HttpClientTestingModule],
      providers: [provideAnimations(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GestionProveedores);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
