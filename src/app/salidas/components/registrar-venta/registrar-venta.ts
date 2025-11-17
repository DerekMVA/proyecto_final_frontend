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
  templateUrl: './registrar-venta.html',
  styleUrl: './registrar-venta.css'
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
