import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Sidebar } from './core/components/sidebar/sidebar.component';
import { ToastContainer } from './core/components/toast-container/toast-container.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Sidebar, ToastContainer],
  template: `
<div class="flex h-screen bg-gray-100">
  <app-sidebar></app-sidebar>
  <main class="flex-grow overflow-y-auto">
    <router-outlet></router-outlet>
  </main>
</div>
<app-toast-container></app-toast-container>
  `,
})
export class App {}
