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
  template: `
<div class="p-6 lg:p-8 space-y-8">
  <div class="flex flex-wrap items-center justify-between gap-4">
    <div>
      <p class="text-sm font-semibold text-blue-600 uppercase tracking-tight">Salidas</p>
      <h1 class="text-3xl font-bold text-gray-900">Gestión de clientes</h1>
      <p class="text-sm text-gray-500">Consulta y registra clientes vinculados a tus ventas.</p>
    </div>
    <div class="flex gap-3">
      <button type="button" class="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 font-medium hover:border-gray-300" (click)="refrescar()">
        Refrescar
      </button>
      <a routerLink="/salidas" class="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700">Historial de ventas</a>
      <a routerLink="/salidas/nueva" class="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700">+ Registrar venta</a>
    </div>
  </div>

  <section class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
    <article class="stat-card">
      <p class="stat-label">Clientes activos</p>
      <p class="stat-value">{{ estadisticas().total }}</p>
    </article>
    <article class="stat-card">
      <p class="stat-label">Premium</p>
      <p class="stat-value">{{ estadisticas().premium }}</p>
    </article>
    <article class="stat-card">
      <p class="stat-label">Compras último mes</p>
      <p class="stat-value">{{ estadisticas().comprasUltimoMes }}</p>
    </article>
    <article class="stat-card">
      <p class="stat-label">Monto histórico</p>
      <p class="stat-value">{{ estadisticas().montoAcumulado | currency:'CRC':'symbol-narrow':'1.0-0' }}</p>
    </article>
  </section>

  <section class="grid grid-cols-1 xl:grid-cols-3 gap-8">
    <article class="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <label class="text-sm text-gray-600 space-y-1">
          Buscar
          <input
            type="search"
            class="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder="Nombre, correo o teléfono"
            [value]="terminoBusqueda()"
            (input)="actualizarBusqueda($any($event.target).value)"
            >
          </label>
          <label class="text-sm text-gray-600 space-y-1">
            Categoría
            <select
              class="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              [value]="filtroCategoria()"
              (change)="actualizarFiltroCategoria($any($event.target).value)"
              >
              <option value="todos">Todas</option>
              <option value="Premium">Premium</option>
              <option value="Frecuente">Frecuente</option>
              <option value="Ocasional">Ocasional</option>
            </select>
          </label>
          <div class="text-sm text-gray-600 space-y-1">
            Resultados
            <div class="h-10 flex items-center px-4 rounded-xl border border-gray-200 text-gray-700">{{ clientesFiltrados().length }}</div>
          </div>
        </div>

        @if (loading()) {
          <div class="space-y-3">
            <div class="animate-pulse h-16 rounded-xl bg-gray-100"></div>
            <div class="animate-pulse h-16 rounded-xl bg-gray-100"></div>
            <div class="animate-pulse h-16 rounded-xl bg-gray-100"></div>
          </div>
        }

        @if (!loading() && error()) {
          <div class="p-4 bg-red-50 text-red-700 rounded-xl">
            {{ error() }}
          </div>
        }

        @if (!loading() && !error()) {
          <div class="overflow-x-auto">
            <table class="min-w-full text-sm">
              <thead>
                <tr class="text-left text-gray-500 border-b">
                  <th class="py-3 pr-4">Cliente</th>
                  <th class="py-3 pr-4">Contacto</th>
                  <th class="py-3 pr-4">Actividad</th>
                  <th class="py-3 pr-4 text-right">Compras</th>
                </tr>
              </thead>
              <tbody>
                @for (cliente of clientesFiltrados(); track trackByCliente($index, cliente)) {
                  <tr class="border-b last:border-0">
                    <td class="py-4 pr-4">
                      <p class="font-semibold text-gray-900">{{ cliente.nombre }}</p>
                      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                                    [ngClass]="{
                                        'bg-yellow-50 text-yellow-800': cliente.categoria === 'Ocasional',
                                        'bg-blue-50 text-blue-800': cliente.categoria === 'Frecuente',
                                        'bg-purple-50 text-purple-800': cliente.categoria === 'Premium'
                                    }"
                        >
                        {{ cliente.categoria }}
                      </span>
                    </td>
                    <td class="py-4 pr-4">
                      <p class="text-gray-700">{{ cliente.correo }}</p>
                      <p class="text-gray-500">{{ cliente.telefono || 'Sin teléfono' }}</p>
                    </td>
                    <td class="py-4 pr-4 text-gray-600">
                      <p>Registro: {{ cliente.fechaRegistro ? (cliente.fechaRegistro | date:'dd/MMM/yy') : '—' }}</p>
                      <p>Último mes: {{ cliente.comprasUltimoMes ?? 0 }} compras</p>
                    </td>
                    <td class="py-4 pr-4 text-right">
                      <p class="font-semibold text-gray-900">{{ (cliente.montoAcumulado ?? 0) | currency:'CRC':'symbol-narrow':'1.0-0' }}</p>
                    </td>
                  </tr>
                }
                @if (clientesFiltrados().length === 0) {
                  <tr>
                    <td colspan="4" class="py-6 text-center text-gray-500">No se encontraron clientes con los filtros actuales.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </article>

      <article class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
        <div>
          <h2 class="text-xl font-semibold text-gray-900">Registrar cliente</h2>
          <p class="text-sm text-gray-500">Completa el formulario para crear un nuevo cliente.</p>
        </div>
        <div class="space-y-4">
          <label class="text-sm text-gray-600 space-y-1">
            Nombre completo
            <input type="text" class="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Ej: Carlos Rodríguez" [value]="formularioNuevo().nombre" (input)="actualizarCampoFormulario('nombre', $any($event.target).value)">
          </label>
          <label class="text-sm text-gray-600 space-y-1">
            Correo
            <input type="email" class="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="correo@cliente.com" [value]="formularioNuevo().correo" (input)="actualizarCampoFormulario('correo', $any($event.target).value)">
          </label>
          <label class="text-sm text-gray-600 space-y-1">
            Teléfono
            <input type="text" class="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="8888-0000" [value]="formularioNuevo().telefono" (input)="actualizarCampoFormulario('telefono', $any($event.target).value)">
          </label>
          <label class="text-sm text-gray-600 space-y-1">
            Categoría
            <select class="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-100" [value]="formularioNuevo().categoria" (change)="actualizarCampoFormulario('categoria', $any($event.target).value)">
              <option value="Premium">Premium</option>
              <option value="Frecuente">Frecuente</option>
              <option value="Ocasional">Ocasional</option>
            </select>
          </label>
          <label class="text-sm text-gray-600 space-y-1">
            Ubicación
            <input type="text" class="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="San José" [value]="formularioNuevo().ubicacion" (input)="actualizarCampoFormulario('ubicacion', $any($event.target).value)">
          </label>
        </div>
        <button type="button" class="w-full rounded-2xl bg-green-600 text-white font-semibold py-3 hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed" [disabled]="!puedeCrear()" (click)="registrarCliente()">
          {{ creando() ? 'Guardando...' : 'Guardar cliente' }}
        </button>
        <p class="text-xs text-gray-500 text-center">El nuevo cliente quedará disponible para futuras ventas.</p>
      </article>
    </section>
  </div>
  `,
  styles: [`
.stat-card {
  @apply rounded-2xl border border-gray-100 bg-white p-5 shadow-sm;
}

.stat-label {
  @apply text-sm text-gray-500;
}

.stat-value {
  @apply text-2xl font-semibold text-gray-900;
}

  `],
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
