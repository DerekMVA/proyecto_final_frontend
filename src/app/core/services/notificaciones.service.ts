import { Injectable, effect, signal } from '@angular/core';

export type ToastTipo = 'exito' | 'error' | 'info';

export interface Toast {
  id: number;
  tipo: ToastTipo;
  mensaje: string;
  duracion: number;
}

@Injectable({ providedIn: 'root' })
export class NotificacionesService {
  private readonly isBrowser = typeof window !== 'undefined';
  private readonly toastsInternos = signal<Toast[]>([]);
  private readonly timeouts = new Map<number, ReturnType<typeof setTimeout>>();
  private idActual = 0;

  readonly toasts = this.toastsInternos.asReadonly();

  constructor() {
    effect(() => {
      if (!this.isBrowser) {
        return;
      }
      for (const toast of this.toastsInternos()) {
        if (!this.timeouts.has(toast.id)) {
          const handle = setTimeout(() => this.cerrar(toast.id), toast.duracion);
          this.timeouts.set(toast.id, handle);
        }
      }
    });
  }

  exito(mensaje: string, duracion = 4000): void {
    this.mostrar('exito', mensaje, duracion);
  }

  error(mensaje: string, duracion = 5000): void {
    this.mostrar('error', mensaje, duracion);
  }

  info(mensaje: string, duracion = 4000): void {
    this.mostrar('info', mensaje, duracion);
  }

  cerrar(id: number): void {
    const timeout = this.timeouts.get(id);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(id);
    }
    this.toastsInternos.update(actual => actual.filter(toast => toast.id !== id));
  }

  private mostrar(tipo: ToastTipo, mensaje: string, duracion: number): void {
    this.idActual += 1;
    const id = this.idActual;
    this.toastsInternos.update(actual => [...actual, { id, tipo, mensaje, duracion }]);
    if (!this.isBrowser) {
      return;
    }
    const handle = setTimeout(() => this.cerrar(id), duracion);
    this.timeouts.set(id, handle);
  }
}
