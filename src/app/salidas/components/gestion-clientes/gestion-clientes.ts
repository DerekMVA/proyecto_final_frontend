import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, finalize } from 'rxjs';
import { ClientesService } from '../../../core/services/clientes.service';
import { Cliente, CategoriaCliente } from '../../../core/models/cliente';
import { NotificacionesService } from '../../../core/services/notificaciones.service';

@Component({
  selector: 'app-gestion-clientes',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './gestion-clientes.html',
  styleUrl: './gestion-clientes.css'
})
export class GestionClientes {
  private readonly clientesService = inject(ClientesService);
  private readonly notificaciones = inject(NotificacionesService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal<boolean>(true);
  readonly error = signal<string | null>(null);
  readonly clientes = signal<Cliente[]>([]);
  readonly terminoBusqueda = signal<string>('');
  readonly filtroCategoria = signal<'todos' | CategoriaCliente>('todos');
  readonly creando = signal<boolean>(false);
  readonly formularioNuevo = signal<NuevoClienteForm>({
    nombre: '',
    correo: '',
    telefono: '',
    categoria: 'Frecuente',
    ubicacion: ''
  });

  readonly clientesFiltrados = computed(() => {
    const termino = this.terminoBusqueda().trim().toLowerCase();
    const filtro = this.filtroCategoria();
    return this.clientes().filter(cliente => {
      if (filtro !== 'todos' && cliente.categoria !== filtro) {
        return false;
      }
      if (!termino) {
        return true;
      }
      const nombre = cliente.nombre?.toLowerCase() ?? '';
      const correo = cliente.correo?.toLowerCase() ?? '';
      const telefono = cliente.telefono?.toLowerCase() ?? '';
      return nombre.includes(termino) || correo.includes(termino) || telefono.includes(termino);
    });
  });

  readonly estadisticas = computed(() => {
    const clientes = this.clientes();
    const total = clientes.length;
    const premium = clientes.filter(cliente => cliente.categoria === 'Premium');
    const frecuentes = clientes.filter(cliente => cliente.categoria === 'Frecuente');
    const ocasionales = clientes.filter(cliente => cliente.categoria === 'Ocasional');
    const comprasUltimoMes = clientes.reduce((acc, cliente) => acc + (cliente.comprasUltimoMes ?? 0), 0);
    const montoAcumulado = clientes.reduce((acc, cliente) => acc + (cliente.montoAcumulado ?? 0), 0);
    return {
      total,
      premium: premium.length,
      frecuentes: frecuentes.length,
      ocasionales: ocasionales.length,
      comprasUltimoMes,
      montoAcumulado
    };
  });

  readonly puedeCrear = computed(() => {
    const formulario = this.formularioNuevo();
    const tieneNombre = formulario.nombre.trim().length > 2;
    const tieneCorreo = formulario.correo.trim().length > 5;
    return tieneNombre && tieneCorreo && !this.creando();
  });

  readonly trackByCliente = (_: number, cliente: Cliente): number => cliente.id;
  readonly categorias: CategoriaCliente[] = ['Premium', 'Frecuente', 'Ocasional'];

  constructor() {
    this.cargarClientes();
  }

  refrescar(): void {
    this.cargarClientes(true);
  }

  actualizarBusqueda(valor: string): void {
    this.terminoBusqueda.set(valor);
  }

  actualizarFiltroCategoria(valor: string): void {
    if (valor === 'todos' || this.categorias.includes(valor as CategoriaCliente)) {
      this.filtroCategoria.set(valor as 'todos' | CategoriaCliente);
    }
  }

  actualizarCampoFormulario(campo: keyof NuevoClienteForm, valor: string): void {
    this.formularioNuevo.update(actual => ({ ...actual, [campo]: valor }));
  }

  registrarCliente(): void {
    if (!this.puedeCrear()) {
      return;
    }
    const formulario = this.formularioNuevo();
    this.creando.set(true);

    this.clientesService
      .registrarCliente({
        nombre: formulario.nombre.trim(),
        correo: formulario.correo.trim(),
        telefono: formulario.telefono?.trim() || null,
        categoria: formulario.categoria,
        ubicacion: formulario.ubicacion?.trim() || null
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.creando.set(false)),
        catchError(error => {
          console.error('No se pudo registrar el cliente', error);
          this.notificaciones.error('No se pudo registrar el cliente. Intenta de nuevo.');
          return EMPTY;
        })
      )
      .subscribe(clienteCreado => {
        this.clientes.update(actual => [clienteCreado, ...actual]);
        this.notificaciones.exito('Cliente registrado correctamente.');
        this.formularioNuevo.set({ nombre: '', correo: '', telefono: '', categoria: 'Frecuente', ubicacion: '' });
      });
  }

  private cargarClientes(esRefresco = false): void {
    this.loading.set(true);
    this.error.set(null);

    this.clientesService
      .obtenerClientes()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
        catchError(error => {
          console.error('No se pudo cargar el catálogo de clientes', error);
          this.error.set('No se pudo cargar la lista de clientes.');
          this.notificaciones.error('No se pudo obtener la lista de clientes.');
          return EMPTY;
        })
      )
      .subscribe(clientes => {
        this.clientes.set(clientes);
        const mensaje = esRefresco ? 'Clientes actualizados.' : 'Clientes cargados.';
        this.notificaciones.info(mensaje);
      });
  }
}

interface NuevoClienteForm {
  nombre: string;
  correo: string;
  telefono: string;
  categoria: CategoriaCliente;
  ubicacion: string;
}
