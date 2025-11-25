import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { NotificacionesService, Toast } from '../../services/notificaciones.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
<div class="fixed inset-0 z-50 flex flex-col items-end pointer-events-none px-4 py-6 gap-3 sm:px-6">
  <div class="w-full max-w-sm flex flex-col gap-3 ml-auto">
    @for (toast of toasts(); track toast) {
      <div class="pointer-events-auto border-l-4 rounded-md shadow bg-white overflow-hidden">
        <div class="px-4 py-3 flex items-start gap-3" [ngClass]="obtenerClases(toast.tipo)">
          <div class="flex-1 text-sm">
            {{ toast.mensaje }}
          </div>
          <button type="button"
            class="text-xs uppercase tracking-wide font-semibold opacity-70 hover:opacity-100"
            (click)="cerrar(toast)">
            Cerrar
          </button>
        </div>
      </div>
    }
  </div>
</div>

  `,
  styles: [`

  `],
})
export class ToastContainer {
  private readonly notificaciones = inject(NotificacionesService);

  readonly toasts = computed(() => this.notificaciones.toasts());

  cerrar(toast: Toast): void {
    this.notificaciones.cerrar(toast.id);
  }

  obtenerClases(tipo: Toast['tipo']): string {
    switch (tipo) {
      case 'exito':
        return 'border-green-500 bg-green-50 text-green-800';
      case 'error':
        return 'border-red-500 bg-red-50 text-red-800';
      default:
        return 'border-blue-500 bg-blue-50 text-blue-800';
    }
  }
}
