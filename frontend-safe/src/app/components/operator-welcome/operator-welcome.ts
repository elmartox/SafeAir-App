import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { DashboardNavbarComponent } from './dashboard/sections/navbar/navbar.component';
import { DashboardHeaderComponent } from './dashboard/sections/header/header.component';
import { AuthService } from '../../services/auth.service';

/**
 * Componente Contenedor - Operator Welcome
 *
 * Responsabilidades:
 * - Proporcionar estructura principal
 * - Gestionar navegacion entre Dashboard, Reportes, Settings
 * - Validar sesion del operador
 * - Mostrar outlet para enrutamiento de subcomponentes
 */
@Component({
  selector: 'app-operator-welcome',
  standalone: true,
  imports: [CommonModule, RouterModule, DashboardNavbarComponent, DashboardHeaderComponent],
  templateUrl: './operator-welcome.html',
  styleUrl: './operator-welcome.css',
})
export class OperatorWelcome implements OnInit {
  currentRoute: string = 'dashboard';
  isOperator: boolean = true;
  userEmail: string = '';
  accessMessage: string = 'Acceso restringido: Solo operadores pueden acceder aqui.';

  constructor(
    private router: Router,
    private auth: AuthService,
    @Inject(PLATFORM_ID) private platformId: object
  ) {}

  get userName(): string {
    return this.auth.getUserName();
  }

  ngOnInit(): void {
    console.log('Componente OperatorWelcome inicializado');
    this.validateOperatorRole();
    this.setInitialRoute();
  }

  /**
   * Valida si el usuario esta logueado (desde localStorage)
   * Solo funciona en el navegador (no en SSR)
   */
  private validateOperatorRole(): void {
    if (isPlatformBrowser(this.platformId)) {
      const isLogged = localStorage.getItem('userLogged') === 'true';
      const userRole = localStorage.getItem('userRole');
      this.userEmail = localStorage.getItem('userEmail') || '';

      this.isOperator = isLogged && userRole === 'operator';

      if (!this.isOperator) {
        console.warn(this.accessMessage);
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 500);
      }
    } else {
      this.isOperator = true;
    }
  }

  /**
   * Establece la ruta inicial del dashboard
   */
  private setInitialRoute(): void {
    this.currentRoute = 'dashboard';
  }

  /**
   * Navega a una ruta especifica del operador
   */
  navigateTo(route: string): void {
    this.currentRoute = route;

    const routeMap: { [key: string]: string } = {
      dashboard: '/operator-welcome/dashboard',
      reports: '/operator-welcome/reports',
      home: '/operator-welcome',
      settings: '/operator-welcome/settings',
    };

    if (routeMap[route]) {
      this.router.navigate([routeMap[route]]);
      console.log(`Navegando a: ${route}`);
    }
  }

  /**
   * Cierra sesion del operador
   */
  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('userLogged');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userEmail');
    }
    this.router.navigate(['/login']);
  }
}
