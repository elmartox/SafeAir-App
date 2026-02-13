import { Component, ElementRef, HostListener, Inject } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../../services/auth.service';

type SearchAction =
  | 'filters'
  | 'reports'
  | 'export'
  | 'theme-light'
  | 'theme-dark'
  | 'password'
  | 'logout';

interface SearchOption {
  label: string;
  description: string;
  action: SearchAction;
  keywords: string[];
}

@Component({
  selector: 'app-dashboard-header',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class DashboardHeaderComponent {
  searchQuery = '';
  showSuggestions = false;

  private options: SearchOption[] = [
    {
      label: 'Filtrar reportes',
      description: 'Ir a filtros del reporte',
      action: 'filters',
      keywords: ['filtrar', 'filtro', 'buscar', 'fecha', 'alerta']
    },
    {
      label: 'Ver reporte',
      description: 'Abrir vista de reportes',
      action: 'reports',
      keywords: ['ver', 'reporte', 'reportes', 'historico', 'historial']
    },
    {
      label: 'Exportar reporte',
      description: 'Abrir sección de exportación',
      action: 'export',
      keywords: ['exportar', 'csv', 'pdf', 'json', 'descargar']
    },
    {
      label: 'Tema claro',
      description: 'Cambiar interfaz a claro',
      action: 'theme-light',
      keywords: ['tema', 'claro', 'interfaz', 'light']
    },
    {
      label: 'Tema oscuro',
      description: 'Cambiar interfaz a oscuro',
      action: 'theme-dark',
      keywords: ['tema', 'oscuro', 'interfaz', 'dark']
    },
    {
      label: 'Cambiar contraseña',
      description: 'Ir a recuperación de contraseña',
      action: 'password',
      keywords: ['contraseña', 'password', 'cambiar', 'recuperar']
    },
    {
      label: 'Cerrar sesión',
      description: 'Salir del sistema',
      action: 'logout',
      keywords: ['logout', 'salir', 'cerrar', 'sesion']
    }
  ];

  constructor(
    private router: Router,
    private auth: AuthService,
    @Inject(DOCUMENT) private document: Document,
    private elementRef: ElementRef<HTMLElement>
  ) {}

  get filteredOptions(): SearchOption[] {
    const query = this.searchQuery.trim().toLowerCase();
    if (!query) return this.options;
    return this.options.filter((option) =>
      option.label.toLowerCase().includes(query) ||
      option.keywords.some((keyword) => keyword.includes(query))
    );
  }

  // Busca la mejor opcion segun texto escrito y ejecuta su accion.
  onSearch(): void {
    const query = this.searchQuery.trim().toLowerCase();
    if (!query) return;

    const match =
      this.options.find((option) => option.label.toLowerCase() === query) ||
      this.options.find((option) =>
        option.keywords.some((keyword) => query.includes(keyword))
      );

    if (match) {
      this.executeAction(match.action);
    }
  }

  onSelect(action: SearchAction): void {
    this.executeAction(action);
  }

  onBlur(): void {
    window.setTimeout(() => {
      this.showSuggestions = false;
    }, 120);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as Node | null;
    if (target && !this.elementRef.nativeElement.contains(target)) {
      this.showSuggestions = false;
    }
  }

  // Centraliza lo que pasa cuando el usuario elige una accion rapida.
  private executeAction(action: SearchAction): void {
    this.showSuggestions = false;
    this.searchQuery = '';

    switch (action) {
      case 'filters':
        this.router.navigate(['/operator-welcome/reports'], { fragment: 'filters' });
        break;
      case 'reports':
        this.router.navigate(['/operator-welcome/reports']);
        break;
      case 'export':
        this.router.navigate(['/operator-welcome/reports'], { fragment: 'export' });
        break;
      case 'theme-light':
        this.applyTheme('light');
        this.router.navigate(['/operator-welcome/settings']);
        break;
      case 'theme-dark':
        this.applyTheme('dark');
        this.router.navigate(['/operator-welcome/settings']);
        break;
      case 'password':
        this.router.navigate(['/recuperar-contraseña']);
        break;
      case 'logout':
        this.auth.logout();
        this.router.navigate(['/login']);
        break;
      default:
        break;
    }
  }

  // Aplica tema visual en la raiz del documento y lo guarda en localStorage.
  private applyTheme(theme: 'light' | 'dark'): void {
    const root = this.document.documentElement;
    root.classList.remove('theme-light', 'theme-dark');

    if (theme === 'light') {
      root.classList.add('theme-light');
      localStorage.setItem('theme', 'light');
    } else {
      root.classList.add('theme-dark');
      localStorage.setItem('theme', 'dark');
    }
  }
}
