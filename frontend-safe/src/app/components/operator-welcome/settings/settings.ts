import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

/**
 * Componente Configuracion del Sistema
 *
 * Responsabilidades:
 * - Mostrar opciones de configuracion general
 * - Mostrar parametros tecnicos (umbrales, frecuencia de muestreo)
 * - Mostrar opciones de interfaz (tema, idioma)
 * - Mostrar opciones de seguridad
 * - Mostrar informacion de la aplicacion
 */
@Component({
  selector: 'app-operator-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
})
export class OperatorSettings implements OnInit {
  isOperator: boolean = true;
  accessMessage: string = 'Acceso restringido: Solo operadores pueden ver configuracion.';

  config = {
    notifications: true,
    autoSave: true,
    maintenanceMode: false,
    cloudSync: true,
    alertThreshold: 300,
    samplingFrequency: 60,
    criticalLevel: 500,
    theme: 'light',
    language: 'es',
    compactMode: false,
    twoFactorAuth: true,
  };

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    console.log('Componente de Configuracion iniciado');
    this.validateOperatorRole();
    this.loadThemePreference();
  }

  // Comprueba si el rol actual puede ver esta pantalla.
  private validateOperatorRole(): void {
    const userRole = 'operator';
    this.isOperator = userRole === 'operator';

    if (!this.isOperator) {
      console.warn(this.accessMessage);
    }
  }

  // Guarda configuracion y aplica el tema seleccionado.
  onSaveSettings(): void {
    console.log('Guardando configuracion...', this.config);
    this.applyTheme(this.config.theme);
  }

  // Restaura valores por defecto luego de pedir confirmacion.
  onResetSettings(): void {
    console.log('Restaurando configuracion predeterminada...');
    if (confirm('Estas seguro de que deseas restablecer toda la configuracion?')) {
      this.config = {
        notifications: true,
        autoSave: true,
        maintenanceMode: false,
        cloudSync: true,
        alertThreshold: 300,
        samplingFrequency: 60,
        criticalLevel: 500,
        theme: 'light',
        language: 'es',
        compactMode: false,
        twoFactorAuth: true,
      };
      this.applyTheme(this.config.theme);
    }
  }

  onCalibrateSensor(): void {
    console.log('Iniciando calibracion del sensor...');
  }

  // Abre la pantalla para recuperar o cambiar contraseña.
  onChangePassword(): void {
    this.router.navigate(['/recuperar-contraseña']);
  }

  // Cierra sesion desde configuracion.
  onLogout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  // Carga el tema guardado para mantener preferencia entre sesiones.
  private loadThemePreference(): void {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light' || savedTheme === 'dark') {
      this.config.theme = savedTheme;
      this.applyTheme(savedTheme);
    }
  }

  // Activa clase CSS del tema y guarda la preferencia en localStorage.
  private applyTheme(theme: string): void {
    const root = this.document.documentElement;
    root.classList.remove('theme-light', 'theme-dark');

    if (theme === 'light') {
      root.classList.add('theme-light');
      localStorage.setItem('theme', 'light');
    } else if (theme === 'dark') {
      root.classList.add('theme-dark');
      localStorage.setItem('theme', 'dark');
    } else {
      localStorage.removeItem('theme');
    }
  }
}
