import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ListaCompras } from './lista-compras.component';

describe('ListaCompras', () => {
  let component: ListaCompras;
  let fixture: ComponentFixture<ListaCompras>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListaCompras],
      providers: [provideRouter([]), provideHttpClient()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListaCompras);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
