import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  template: `
<div class="w-64 h-full bg-gray-800 text-white flex flex-col shadow-lg">
    <div class="p-6 text-2xl font-bold border-b border-gray-700 flex items-center justify-center space-x-3">
    <img src="assets/images/logo.png" alt="Logo" class="w-8 h-8 object-contain" />
    <span>Techno-Logic</span>
  </div>
    <nav class="flex-grow p-4 space-y-2">
        <a routerLink="/admin" routerLinkActive="bg-gray-700" [routerLinkActiveOptions]="{exact: true}"
            class="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700">Dashboard</a>
        <a routerLink="/inventario" routerLinkActive="bg-gray-700"
            class="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700">Inventario</a>
        <a routerLink="/entradas" routerLinkActive="bg-gray-700"
            class="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700">Compras</a>
        <a routerLink="/salidas/nueva" routerLinkActive="bg-gray-700"
            class="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700">Ventas</a>
        <a routerLink="/ordenes" routerLinkActive="bg-gray-700"
            class="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700">garantia</a>
        <a routerLink="/ensamble" routerLinkActive="bg-gray-700"
            class="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700">Ensamble</a>
        <a routerLink="/mantenimiento" routerLinkActive="bg-gray-700"
            class="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700">Mantenimiento</a>
        <a routerLink="/admin/usuarios" routerLinkActive="bg-gray-700"
            class="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700">Usuarios</a>
    </nav>
</div>
  `,
  styles: [`

  `],
})
export class Sidebar {

}
