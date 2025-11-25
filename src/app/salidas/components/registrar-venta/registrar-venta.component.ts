import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, finalize } from 'rxjs';
import { InventarioService } from '../../../core/services/inventario.service';
import { VentasService } from '../../../core/services/ventas.service';
import { NotificacionesService } from '../../../core/services/notificaciones.service';
import { InventarioItem } from '../../../core/models/inventario';
import { RegistrarVentaPayload } from '../../../core/models/venta';
import { ClientesService } from '../../../core/services/clientes.service';
import { Cliente } from '../../../core/models/cliente';

@Component({
  selector: 'app-registrar-venta',
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
<div class="p-6 lg:p-8 grid grid-cols-1 xl:grid-cols-3 gap-8">
  <section class="xl:col-span-2 space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p class="text-sm font-semibold text-blue-600 uppercase tracking-tight">Salidas</p>
        <h1 class="text-3xl font-bold text-gray-900">Registrar nueva venta</h1>
        <p class="text-gray-500">Selecciona los productos, define la información del cliente y genera la factura.</p>
      </div>
      <div class="flex gap-3">
        <a routerLink="/salidas" class="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 font-medium hover:border-gray-300">Historial de ventas</a>
        <a routerLink="/salidas/clientes" class="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 font-medium hover:border-gray-300">Gestión de clientes</a>
      </div>
    </div>

    <article class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
      <div class="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 class="text-xl font-semibold text-gray-900">Catálogo disponible</h2>
          <p class="text-sm text-gray-500">Busca por nombre o código para agregar productos rápidamente.</p>
        </div>
        <input
          type="search"
          placeholder="Buscar producto para agregar..."
          class="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          [value]="busqueda()"
          (input)="actualizarBusqueda($any($event.target).value)"
          >
        </div>

        @if (loadingCatalogo()) {
          <div class="space-y-3">
            <div class="animate-pulse h-16 rounded-xl bg-gray-100"></div>
            <div class="animate-pulse h-16 rounded-xl bg-gray-100"></div>
          </div>
        }

        @if (!loadingCatalogo() && catalogoError()) {
          <div class="p-4 bg-red-50 text-red-700 rounded-xl">
            {{ catalogoError() }}
          </div>
        }

        @if (!loadingCatalogo() && !catalogoError()) {
          <div class="space-y-3" data-testid="sugerencias-productos">
            @if (productosSugeridos().length === 0) {
              <div class="p-4 border border-dashed border-gray-200 rounded-xl text-sm text-gray-500">
                No hay resultados para tu búsqueda. Intenta con otro término.
              </div>
            }
            @for (producto of productosSugeridos(); track producto) {
              <div class="flex items-center justify-between gap-3 border rounded-2xl p-4 hover:border-blue-200 transition">
                <div>
                  <p class="font-semibold text-gray-900">{{ producto.nombre }}</p>
                  <p class="text-sm text-gray-500">Código {{ producto.codigo }} • Stock {{ producto.stockActual }}</p>
                </div>
                <div class="flex items-center gap-4 flex-shrink-0">
                  <span class="font-bold text-lg text-gray-900">{{ producto.precioUnitario | currency:'CRC':'symbol-narrow':'1.2-2' }}</span>
                  <button
                    class="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    type="button"
                    [disabled]="producto.stockActual === 0"
                    (click)="seleccionarProducto(producto)"
                    >
                    Agregar
                  </button>
                </div>
              </div>
            }
          </div>
        }
      </article>

      <article class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xl font-semibold text-gray-900">Productos seleccionados</h2>
            <p class="text-sm text-gray-500">Administra cantidades y precios antes de registrar la venta.</p>
          </div>
          <span class="text-sm text-gray-500">{{ resumen().articulos }} artículos</span>
        </div>

        @if (lineas().length === 0) {
          <div class="p-6 border border-dashed border-gray-200 rounded-2xl text-center text-gray-500">
            Aún no has agregado productos al pedido.
          </div>
        }

        @if (lineas().length > 0) {
          <div class="space-y-4">
            @for (linea of lineas(); track trackByLinea($index, linea)) {
              <div class="border rounded-2xl p-4">
                <div class="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p class="font-semibold text-gray-900">{{ linea.nombre }}</p>
                    <p class="text-sm text-gray-500">Código {{ linea.codigo }} • Stock {{ linea.stockActual }}</p>
                  </div>
                  <button type="button" class="text-sm text-red-600 hover:text-red-700" (click)="eliminarLinea(linea.id)">
                    Quitar
                  </button>
                </div>
                <div class="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label class="text-sm text-gray-500 space-y-1">
                    Cantidad
                    <input
                      type="number"
                      min="1"
                      class="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      [value]="linea.cantidad"
                      (input)="cambiarCantidad(linea.id, $any($event.target).value)"
                      >
                    </label>
                    <label class="text-sm text-gray-500 space-y-1">
                      Precio unitario
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        class="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        [value]="linea.precioUnitario"
                        (input)="cambiarPrecio(linea.id, $any($event.target).value)"
                        >
                      </label>
                      <div class="text-sm text-gray-500 flex flex-col justify-end">
                        <span>Subtotal</span>
                        <p class="text-lg font-semibold text-gray-900">{{ (linea.cantidad * linea.precioUnitario) | currency:'CRC':'symbol-narrow':'1.2-2' }}</p>
                      </div>
                    </div>
                  </div>
                }
              </div>
            }
          </article>
        </section>

        <section class="bg-gray-50 rounded-2xl border border-gray-100 p-6 space-y-6">
          <div>
            <h2 class="text-2xl font-semibold text-gray-900">Resumen del pedido</h2>
            <p class="text-sm text-gray-500">Completa los datos del cliente para finalizar la venta.</p>
          </div>

          <div class="space-y-4">
            <div class="rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
              <div class="flex items-center justify-between gap-2">
                <div>
                  <p class="text-sm font-semibold text-gray-800">Buscar cliente registrado</p>
                  <p class="text-xs text-gray-500">Selecciona un cliente existente para reutilizar su información.</p>
                </div>
                @if (clienteSeleccionado()) {
                  <button type="button" class="text-xs font-semibold text-red-600 hover:text-red-700" (click)="limpiarClienteSeleccion()">
                    Quitar selección
                  </button>
                }
              </div>
              <input type="search" placeholder="Nombre, correo o teléfono" class="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-100" [value]="clienteFiltro()" (input)="actualizarFiltroCliente($any($event.target).value)">
              @if (clientesLoading()) {
                <div class="text-sm text-gray-500">Cargando clientes registrados…</div>
              }
              @if (!clientesLoading() && clientesError()) {
                <div class="text-sm text-red-600">{{ clientesError() }}</div>
              }
              @if (!clientesLoading() && !clientesError()) {
                <div class="space-y-2 max-h-48 overflow-y-auto" data-testid="sugerencias-clientes">
                  @for (item of clientesSugeridos(); track item) {
                    <button type="button" class="w-full text-left border border-gray-200 rounded-xl px-4 py-2 text-sm hover:border-blue-300" (click)="seleccionarCliente(item)">
                      <p class="font-semibold text-gray-900">{{ item.nombre }}</p>
                      <p class="text-xs text-gray-500">{{ item.correo }} • {{ item.telefono || 'Sin teléfono' }}</p>
                    </button>
                  }
                  @if (!clientesSugeridos().length) {
                    <p class="text-xs text-gray-500">No hay coincidencias para el término ingresado.</p>
                  }
                </div>
              }
              @if (clienteResumen(); as info) {
                <div class="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-3 text-xs text-gray-600 space-y-1">
                  <p><span class="font-semibold text-gray-800">Categoría:</span> {{ info.categoria }}</p>
                  <p><span class="font-semibold text-gray-800">Correo:</span> {{ info.correo }}</p>
                  <p><span class="font-semibold text-gray-800">Teléfono:</span> {{ info.telefono }}</p>
                  <p>
                    <span class="font-semibold text-gray-800">Último mes:</span>
                    {{ info.compras }} compras • {{ info.monto | currency:'CRC':'symbol-narrow':'1.2-2' }}
                  </p>
                </div>
              }
            </div>
            <label class="text-sm text-gray-600 space-y-1">
              Nombre del cliente
              <input type="text" class="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Nombre del cliente" [value]="cliente()" (input)="actualizarCliente($any($event.target).value)">
            </label>
            <label class="text-sm text-gray-600 space-y-1">
              Método de pago
              <select class="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-100" [value]="metodoPago()" (change)="actualizarMetodoPago($any($event.target).value)">
                @for (metodo of metodosPago; track metodo) {
                  <option [value]="metodo">{{ metodo }}</option>
                }
              </select>
            </label>
            <label class="text-sm text-gray-600 space-y-1">
              Vendedor
              <input type="text" class="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Nombre del vendedor" [value]="vendedor()" (input)="actualizarVendedor($any($event.target).value)">
            </label>
            <label class="text-sm text-gray-600 space-y-1">
              Observaciones
              <textarea rows="3" class="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Información adicional" [value]="observaciones()" (input)="actualizarObservaciones($any($event.target).value)"></textarea>
            </label>
          </div>

          <div class="space-y-3 border-t border-b border-gray-200 py-4">
            <div class="flex justify-between text-sm text-gray-600">
              <span>Artículos</span>
              <span>{{ resumen().articulos }}</span>
            </div>
            <div class="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span>{{ resumen().subtotal | currency:'CRC':'symbol-narrow':'1.2-2' }}</span>
            </div>
            <div class="flex justify-between text-sm text-gray-600">
              <span>Impuestos (13%)</span>
              <span>{{ resumen().impuestos | currency:'CRC':'symbol-narrow':'1.2-2' }}</span>
            </div>
            <div class="flex justify-between text-xl font-semibold text-gray-900">
              <span>Total</span>
              <span>{{ resumen().total | currency:'CRC':'symbol-narrow':'1.2-2' }}</span>
            </div>
          </div>

          <button
            type="button"
            class="w-full rounded-2xl bg-green-600 text-white font-semibold py-3 hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed"
            [disabled]="!puedeRegistrar()"
            (click)="registrarVenta()"
            >
            {{ registrando() ? 'Registrando venta...' : 'Finalizar venta' }}
          </button>
          <p class="text-xs text-gray-500 text-center">Se enviará la información al backend para registrar la factura.</p>
        </section>
      </div>
  `,
  styles: [`

  `],
})
export class RegistrarVenta {
  private readonly inventarioService = inject(InventarioService);
  private readonly ventasService = inject(VentasService);
  private readonly clientesService = inject(ClientesService);
  private readonly notificaciones = inject(NotificacionesService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly impuesto = 0.13;

  readonly loadingCatalogo = signal<boolean>(true);
  readonly catalogoError = signal<string | null>(null);
  readonly catalogo = signal<InventarioItem[]>([]);
  readonly lineas = signal<LineaVentaForm[]>([]);
  readonly busqueda = signal<string>('');
  readonly cliente = signal<string>('');
  readonly clientes = signal<Cliente[]>([]);
  readonly clientesLoading = signal<boolean>(true);
  readonly clientesError = signal<string | null>(null);
  readonly clienteFiltro = signal<string>('');
  readonly clienteSeleccionadoId = signal<number | null>(null);
  readonly metodoPago = signal<string>('Efectivo');
  readonly vendedor = signal<string>('');
  readonly observaciones = signal<string>('');
  readonly registrando = signal<boolean>(false);

  readonly productosSugeridos = computed(() => {
    const termino = this.busqueda().trim().toLowerCase();
    const base = this.catalogo();
    if (!termino) {
      return base.slice(0, 5);
    }
    return base
      .filter(producto => {
        const nombre = producto.nombre?.toLowerCase() ?? '';
        const codigo = producto.codigo?.toLowerCase() ?? '';
        return nombre.includes(termino) || codigo.includes(termino);
      })
      .slice(0, 5);
  });

  readonly clientesSugeridos = computed(() => {
    const termino = this.clienteFiltro().trim().toLowerCase();
    const base = this.clientes();
    if (!termino) {
      return base.slice(0, 5);
    }
    return base
      .filter(cliente => {
        const nombre = cliente.nombre?.toLowerCase() ?? '';
        const correo = cliente.correo?.toLowerCase() ?? '';
        const telefono = cliente.telefono?.toLowerCase() ?? '';
        return nombre.includes(termino) || correo.includes(termino) || telefono.includes(termino);
      })
      .slice(0, 5);
  });

  readonly clienteSeleccionado = computed(() => {
    const id = this.clienteSeleccionadoId();
    if (!id) {
      return null;
    }
    return this.clientes().find(cliente => cliente.id === id) ?? null;
  });

  readonly clienteResumen = computed(() => {
    const cliente = this.clienteSeleccionado();
    if (!cliente) {
      return null;
    }
    return {
      categoria: cliente.categoria,
      correo: cliente.correo,
      telefono: cliente.telefono ?? 'Sin registrar',
      compras: cliente.comprasUltimoMes ?? 0,
      monto: cliente.montoAcumulado ?? 0
    };
  });

  readonly resumen = computed(() => {
    const lineas = this.lineas();
    const subtotal = lineas.reduce((acc, linea) => acc + linea.cantidad * linea.precioUnitario, 0);
    const impuestos = subtotal * this.impuesto;
    const total = subtotal + impuestos;
    const articulos = lineas.reduce((acc, linea) => acc + linea.cantidad, 0);
    return { subtotal, impuestos, total, articulos };
  });

  readonly puedeRegistrar = computed(() => {
    const cliente = this.cliente().trim();
    const tieneCliente = !!cliente || this.clienteSeleccionadoId();
    return tieneCliente && this.lineas().length > 0 && !this.registrando();
  });

  readonly trackByLinea = (_: number, linea: LineaVentaForm): string => linea.id;

  readonly metodosPago = ['Efectivo', 'Tarjeta', 'Transferencia', 'Sinpe'];

  constructor() {
    this.cargarCatalogo();
    this.cargarClientes();
  }

  actualizarBusqueda(valor: string): void {
    this.busqueda.set(valor);
  }

  actualizarCliente(valor: string): void {
    this.cliente.set(valor);
    const seleccionado = this.clienteSeleccionado();
    if (!seleccionado) {
      return;
    }
    if (seleccionado.nombre.trim() !== valor.trim()) {
      this.clienteSeleccionadoId.set(null);
    }
  }

  actualizarFiltroCliente(valor: string): void {
    this.clienteFiltro.set(valor);
    if (!valor.trim()) {
      return;
    }
  }

  seleccionarCliente(cliente: Cliente): void {
    this.clienteSeleccionadoId.set(cliente.id);
    this.cliente.set(cliente.nombre);
    this.clienteFiltro.set(cliente.nombre);
  }

  limpiarClienteSeleccion(): void {
    this.clienteSeleccionadoId.set(null);
  }

  actualizarMetodoPago(valor: string): void {
    this.metodoPago.set(valor);
  }

  actualizarVendedor(valor: string): void {
    this.vendedor.set(valor);
  }

  actualizarObservaciones(valor: string): void {
    this.observaciones.set(valor);
  }

  seleccionarProducto(producto: InventarioItem): void {
    if (producto.stockActual <= 0) {
      this.notificaciones.info('El producto no tiene stock disponible.');
      return;
    }

    let agregado = false;
    this.lineas.update(lineas => {
      const existente = lineas.find(linea => linea.productoId === producto.id);
      if (existente) {
        if (existente.cantidad >= producto.stockActual) {
          this.notificaciones.info('Alcanzaste el stock disponible para este producto.');
          return lineas;
        }
        agregado = true;
        return lineas.map(linea =>
          linea.productoId === producto.id
            ? { ...linea, cantidad: linea.cantidad + 1, precioUnitario: producto.precioUnitario }
            : linea
        );
      }
      agregado = true;
      return [
        ...lineas,
        {
          id: this.generarLineaId(),
          productoId: producto.id,
          codigo: producto.codigo,
          nombre: producto.nombre,
          stockActual: producto.stockActual,
          cantidad: 1,
          precioUnitario: producto.precioUnitario
        }
      ];
    });

    if (agregado) {
      this.notificaciones.info('Producto agregado al pedido.');
    }
  }

  cambiarCantidad(id: string, valor: string): void {
    const cantidadNumerica = Number(valor);
    if (!Number.isFinite(cantidadNumerica)) {
      return;
    }

    this.lineas.update(lineas =>
      lineas.map(linea => {
        if (linea.id !== id) {
          return linea;
        }
        const maximo = Math.max(1, linea.stockActual);
        const nuevaCantidad = Math.min(Math.max(1, Math.trunc(cantidadNumerica)), maximo);
        return { ...linea, cantidad: nuevaCantidad };
      })
    );
  }

  cambiarPrecio(id: string, valor: string): void {
    const precioNumerico = Number(valor);
    if (!Number.isFinite(precioNumerico)) {
      return;
    }

    this.lineas.update(lineas =>
      lineas.map(linea => (linea.id === id ? { ...linea, precioUnitario: Math.max(0, precioNumerico) } : linea))
    );
  }

  eliminarLinea(id: string): void {
    this.lineas.update(lineas => lineas.filter(linea => linea.id !== id));
  }

  registrarVenta(): void {
    if (!this.puedeRegistrar()) {
      return;
    }

    const clienteSeleccionado = this.clienteSeleccionado();
    const clienteNombre = this.cliente().trim() || clienteSeleccionado?.nombre?.trim() || '';
    if (!clienteNombre) {
      this.notificaciones.info('Selecciona o ingresa un cliente válido.');
      return;
    }

    const payload: RegistrarVentaPayload = {
      clienteId: clienteSeleccionado?.id ?? null,
      cliente: clienteNombre,
      metodoPago: this.metodoPago().trim() || null,
      vendedor: this.vendedor().trim() || null,
      observaciones: this.observaciones().trim() || null,
      detalles: this.lineas().map(linea => ({
        productoId: linea.productoId,
        cantidad: linea.cantidad,
        precioUnitario: linea.precioUnitario
      }))
    };

    this.registrando.set(true);

    this.ventasService
      .registrarVenta(payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.registrando.set(false)),
        catchError(error => {
          console.error('No se pudo registrar la venta', error);
          this.notificaciones.error('No se pudo registrar la venta. Intenta de nuevo.');
          return EMPTY;
        })
      )
      .subscribe(() => {
        this.notificaciones.exito('Venta registrada exitosamente.');
        this.limpiarFormulario();
      });
  }

  private cargarCatalogo(): void {
    this.loadingCatalogo.set(true);
    this.catalogoError.set(null);

    this.inventarioService
      .obtenerInventario()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingCatalogo.set(false)),
        catchError(error => {
          console.error('No se pudo cargar el inventario para las ventas', error);
          this.catalogoError.set('No se pudo cargar el catálogo de productos.');
          this.notificaciones.error('No se pudo cargar el catálogo de productos.');
          return EMPTY;
        })
      )
      .subscribe(productos => {
        this.catalogo.set(productos);
        if (!productos.length) {
          this.notificaciones.info('No hay productos disponibles en inventario.');
        }
      });
  }

  private cargarClientes(): void {
    this.clientesLoading.set(true);
    this.clientesError.set(null);

    this.clientesService
      .obtenerClientes()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.clientesLoading.set(false)),
        catchError(error => {
          console.error('No se pudo cargar el catálogo de clientes para ventas', error);
          this.clientesError.set('No se pudo cargar la lista de clientes.');
          this.notificaciones.error('No se pudo cargar el catálogo de clientes.');
          return EMPTY;
        })
      )
      .subscribe(clientes => {
        this.clientes.set(clientes);
      });
  }

  private limpiarFormulario(): void {
    this.lineas.set([]);
    this.busqueda.set('');
    this.cliente.set('');
    this.clienteFiltro.set('');
    this.clienteSeleccionadoId.set(null);
    this.metodoPago.set('Efectivo');
    this.vendedor.set('');
    this.observaciones.set('');
  }

  private generarLineaId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
    return 'linea-' + Math.random().toString(36).slice(2, 10);
  }
}

interface LineaVentaForm {
  id: string;
  productoId: number;
  codigo: string;
  nombre: string;
  stockActual: number;
  cantidad: number;
  precioUnitario: number;

}
