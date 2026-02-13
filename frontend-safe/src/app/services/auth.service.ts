import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class AuthService {

  // URL base de autenticacion en backend.
  private API = 'http://3.145.133.233:3000/api/users';
  private isBrowser: boolean;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  // Inicia sesion con correo y contraseña.
  login(data: { email: string; password: string }) {
    return this.http.post<any>(`${this.API}/login`, data);
  }

  // Crea un usuario nuevo.
  register(data: { email: string; password: string; name?: string }) {
    return this.http.post<any>(this.API, data);
  }

  requestPasswordReset(data: { email: string }) {
    return this.http.post<any>(`${this.API}/password/request-reset`, data);
  }

  verifyResetCode(data: { email: string; resetCode: string }) {
    return this.http.post<any>(`${this.API}/password/verify-code`, data);
  }

  // Guarda sesion y datos del usuario en localStorage.
  saveSession(user: any) {
    if (!this.isBrowser) return;
    localStorage.setItem('userLogged', 'true');
    localStorage.setItem('userRole', user.role);
    localStorage.setItem('userEmail', user.email);
    const nameFromEmail = user.email ? String(user.email).split('@')[0] : '';
    const displayName =
      user.name ||
      user.nombre ||
      user.username ||
      localStorage.getItem(`userNameByEmail:${user.email}`) ||
      nameFromEmail ||
      'Usuario';
    localStorage.setItem('userName', displayName);
  }

  // Cierra sesion limpiando almacenamiento local.
  logout() {
    if (!this.isBrowser) return;
    localStorage.clear();
  }

  // Revisa si hay una sesion activa guardada.
  isLogged(): boolean {
    if (!this.isBrowser) return false;
    return localStorage.getItem('userLogged') === 'true';
  }

  getRole(): string | null {
    if (!this.isBrowser) return null;
    return localStorage.getItem('userRole');
  }

  // Obtiene el nombre para mostrar en la interfaz.
  getUserName(): string {
    if (!this.isBrowser) return 'Usuario';
    const stored = localStorage.getItem('userName');
    if (stored) return this.toTitleCase(stored);
    const email = localStorage.getItem('userEmail');
    if (email) {
      const byEmail = localStorage.getItem(`userNameByEmail:${email}`);
      if (byEmail) return this.toTitleCase(byEmail);
      return this.toTitleCase(email.split('@')[0]);
    }
    return 'Usuario';
  }

  // Obtiene el correo guardado en la sesion.
  getUserEmail(): string {
    if (!this.isBrowser) return '';
    return localStorage.getItem('userEmail') || '';
  }

  // Guarda nombre asociado al correo para reutilizarlo despues.
  saveNameForEmail(email: string, name: string): void {
    if (!this.isBrowser) return;
    if (!email || !name) return;
    localStorage.setItem(`userNameByEmail:${email}`, name);
  }

  // Normaliza texto para mostrarlo con formato "Nombre Apellido".
  private toTitleCase(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // Cambia la contraseña del usuario.
  resetPassword(data: { email: string; newPassword: string }) {
    return this.http.put(
      'http://localhost:3000/api/users/reset-password',
      {
        email: data.email,
        newPassword: data.newPassword
      }
    );
  }

}
