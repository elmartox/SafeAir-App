import { Component } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { AuthHeaderComponent } from '../shared/auth-header/auth-header.component';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule, AuthHeaderComponent],
  templateUrl: './registro.html',
  styleUrl: './registro.css'
})
export class Registro {

  fullName = '';
  email = '';
  password = '';
  confirmPassword = '';
  errorMessage = '';
  loading = false;
  private allowedEmailDomains = ['gmail.com', 'hotmail.com', 'outlook.com', 'live.com', 'yahoo.com'];

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  // Valida datos del formulario y registra el usuario.
  onSubmit(event: Event) {
    event.preventDefault();
    this.errorMessage = '';

    if (!this.isAllowedEmailDomain(this.email)) {
      this.errorMessage = 'Por favor, ingrese un correo electrónico que exista';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Las contrasenas no coinciden';
      return;
    }

    this.loading = true;

    this.auth.register({
      name: this.fullName,
      email: this.email,
      password: this.password
    }).subscribe({
      next: () => {
        this.auth.saveNameForEmail(this.email, this.fullName.trim());
        this.router.navigate(['/login']);
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Error al registrar usuario';
        this.loading = false;
      }
    });
  }

  // Permite registrar solo correos de dominios comunes para evitar errores de tipeo.
  private isAllowedEmailDomain(email: string): boolean {
    const parts = email.trim().toLowerCase().split('@');
    if (parts.length !== 2) return false;
    const domain = parts[1];
    return this.allowedEmailDomains.includes(domain);
  }
}
