import { Component, OnInit } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-password-recovery',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule],
  templateUrl: './password-recovery.html',
  styleUrl: './password-recovery.css'
})
export class PasswordRecovery implements OnInit {

  step = 1; // 1: email | 2: nueva contraseña | 3: éxito
  loading = false;
  errorMessage = '';
  successMessage = '';

  email = '';
  newPassword = '';
  confirmPassword = '';

  showPassword1 = false;
  showPassword2 = false;
  isSessionEmail = false;

  constructor(
    private auth: AuthService,
    private router: Router,
    private location: Location
  ) {}
  // Si ya hay sesion, salta directo al paso de nueva contraseña.
  ngOnInit(): void {
    const sessionEmail = this.auth.getUserEmail();
    if (sessionEmail) {
      this.email = sessionEmail;
      this.isSessionEmail = true;
      this.step = 2;
    }
  }

  // PASO 1 ? validar email
  continueWithEmail(event: Event): void {
    event.preventDefault();

    if (!this.email) {
      this.errorMessage = 'Ingresa tu correo';
      return;
    }

    this.errorMessage = '';
    this.step = 2;
  }

  // PASO 2 ? actualizar contraseña
  // Aplica validaciones basicas y manda el cambio de contraseña al backend.
  resetPassword(event: Event): void {
    event.preventDefault();
    this.loading = true;
    this.errorMessage = '';

    if (!this.isPasswordValid()) {
      this.errorMessage =
        'La contraseña debe tener mínimo 6 caracteres, letras y números';
      this.loading = false;
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage = 'Las contraseñas no coinciden';
      this.loading = false;
      return;
    }

    this.auth.resetPassword({
      email: this.email,
      newPassword: this.newPassword
    }).subscribe({
      next: () => {
        this.successMessage = 'Contraseña actualizada correctamente';
        this.step = 3;
        this.loading = false;

        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Error al actualizar contraseña';
        this.loading = false;
      }
    });
  }

  // Validaciones
  // Reune en una sola regla las validaciones principales de contraseña.
  isPasswordValid(): boolean {
    return this.hasLetters && this.hasNumbers && this.hasMinLength;
  }

  get hasLetters(): boolean {
    return /[A-Za-z]/.test(this.newPassword);
  }

  get hasNumbers(): boolean {
    return /[0-9]/.test(this.newPassword);
  }

  get hasMinLength(): boolean {
    return this.newPassword.length >= 6;
  }
  // Vuelve al paso anterior o regresa a la pantalla previa si venia de sesion activa.
  goBack(): void {
    if (this.isSessionEmail) {
      this.location.back();
      return;
    }
    this.step = 1;
    this.errorMessage = '';
    this.newPassword = '';
    this.confirmPassword = '';
  }
}
