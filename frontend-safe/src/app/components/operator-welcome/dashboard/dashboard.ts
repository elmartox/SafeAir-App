import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardLayoutModule } from './sections/layout/layout.module';
import { DashboardBusinessComponent } from './sections/business/business.component';
import { DashboardFooterComponent } from './sections/footer/footer.component';

/**
 * Componente Dashboard del Operador
 *
 * Responsabilidades:
 * - Mostrar graficas simuladas de niveles de gas
 * - Mostrar alertas recientes
 * - Mostrar resumen rapido del sistema
 * - Validar visualmente que solo operadores ven este contenido
 *
 * NOTA: Sin logica de backend, solo estructura visual.
 */
@Component({
  selector: 'app-operator-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    DashboardLayoutModule,
    DashboardFooterComponent
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  encapsulation: ViewEncapsulation.None,
})
export class OperatorDashboard implements OnInit {
  /**
   * Indica si el usuario actual tiene rol de operador
   * En un caso real, esto vendria de un servicio de autenticacion
   */
  isOperator: boolean = true;

  /**
   * Mensaje de acceso restringido (solo visual)
   */
  accessMessage: string = 'Acceso restringido: Solo operadores pueden ver este dashboard.';

  ngOnInit(): void {
    // NOTA: En una aplicacion real, validarias el rol del usuario aqui
    // usando un GuardCanActivate o un servicio de autenticacion
    console.log('Dashboard del Operador iniciado');
    this.validateOperatorRole();
  }

  /**
   * Valida visualmente si el usuario es operador
   * SOLO VALIDACION VISUAL - sin guardia real
   */
  private validateOperatorRole(): void {
    // Simulacion de validacion
    // En produccion, consultarias un servicio de autenticacion
    const userRole = 'operator'; // Mock
    this.isOperator = userRole === 'operator';

    if (!this.isOperator) {
      console.warn(this.accessMessage);
    }
  }
}
