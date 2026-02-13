import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../../../services/auth.service';

@Component({
  selector: 'app-dashboard-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class DashboardNavbarComponent {
  constructor(private auth: AuthService, private router: Router) {}

  // Pide confirmacion antes de cerrar sesion para evitar salir por error.
  onLogout(): void {
    const confirmed = window.confirm('Estas seguro de cerrar sesion?');
    if (!confirmed) return;
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
