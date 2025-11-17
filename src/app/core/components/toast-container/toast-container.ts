import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { NotificacionesService, Toast } from '../../services/notificaciones.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast-container.html',
  styleUrl: './toast-container.css'
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
