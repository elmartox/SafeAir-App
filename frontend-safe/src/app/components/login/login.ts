import { Component } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { AuthHeaderComponent } from '../shared/auth-header/auth-header.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule, AuthHeaderComponent],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {

  email = '';
  password = '';
  useFaceId = false;
  loading = false;
  errorMessage = '';

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  // Maneja el envio del formulario, valida credenciales y redirige segun rol.
  onSubmit(event: Event): void {
    event.preventDefault();
    this.loading = true;
    this.errorMessage = '';

    this.auth.login({
      email: this.email,
      password: this.password
    }).subscribe({
      next: (res) => {
        this.auth.saveSession(res);

        if (res.role === 'operator') {
          this.router.navigate(['/operator-welcome']);
        } else {
          this.router.navigate(['/guest-window']);
        }

        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Error al iniciar sesion';
        this.loading = false;
      }
    });
  }


  }
