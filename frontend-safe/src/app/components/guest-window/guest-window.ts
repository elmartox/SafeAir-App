import { Component, OnDestroy, OnInit, ChangeDetectorRef, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AirDataService, AirData } from '../../services/air-data.service';
import { AirControlService, AirControl } from '../../services/air-control.service';

interface Alert {
  id: number;
  time: string;
  message: string;
  type: 'success' | 'warning' | 'critical';
}

interface GasLimit {
  name: string;
  limit: string;
  description: string;
}

type AirQualityStatus = 'good' | 'warning' | 'critical';

@Component({
  selector: 'app-guest-window',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './guest-window.html',
  styleUrl: './guest-window.css'
})
export class GuestWindow implements OnInit, OnDestroy {
  gasSnapshot = {
    room: 'Cocina',
    gasLevel: 0,
    mq2Value: 0,
    sensorLabel: 'MQ-2'
  };
  normalThresholdPpm: number = 120;
  warningThresholdPpm: number = 300;
  criticalThresholdPpm: number = 500;
  currentMessage: string = 'Lectura en tiempo real del sensor MQ-2.';
  lastUpdateTime: string = '19:31:36';
  controlState?: AirControl;
  controlStatusMessage: string = 'Sincronizando controles...';
  private refreshTimer?: number;
  private isBrowser: boolean;

  gasLimits: GasLimit[] = [
    {
      name: 'Umbrales SafeAir',
      limit: '<=120 Normal | >=300 Advertencia | >=500 Peligro',
      description: 'Rangos operativos usados por el semaforo y el estado del sistema.'
    },
    {
      name: 'Rango de deteccion MQ-2',
      limit: '300-10,000 ppm',
      description: 'Rango tipico del sensor para gases inflamables.'
    },
    {
      name: 'Gases detectables',
      limit: 'LPG, metano, butano, humo',
      description: 'El MQ-2 es sensible a estos gases y al humo.'
    },
    {
      name: 'Sensibilidad alta',
      limit: 'Propano y humo',
      description: 'El sensor responde especialmente bien a propano y humo.'
    },
    {
      name: 'Precalentamiento inicial',
      limit: '>= 48 h',
      description: 'Tiempo recomendado para estabilizar lecturas.'
    }
  ];

  preventionTips: string[] = [
    'Si suena la alarma de gas, evacua el area inmediatamente',
    'Abre ventanas y puertas para ventilar',
    'No enciendas llamas ni aparatos electricos',
    'Llama a los servicios de emergencia desde un lugar seguro',
    'Espera a que la autoridad competente declare el lugar seguro'
  ];

  constructor(
    private auth: AuthService,
    private router: Router,
    private airData: AirDataService,
    private airControl: AirControlService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  get userName(): string {
    return this.auth.getUserName();
  }

  // Clasifica el nivel de gas para decidir el estado general en pantalla.
  getGasStatus(): AirQualityStatus {
    if (this.gasSnapshot.gasLevel >= this.criticalThresholdPpm) {
      return 'critical';
    }
    if (
      this.gasSnapshot.gasLevel >= this.warningThresholdPpm ||
      this.gasSnapshot.gasLevel > this.normalThresholdPpm
    ) {
      return 'warning';
    }
    return 'good';
  }

  getStatusColor(): string {
    switch (this.getGasStatus()) {
      case 'good':
        return '#10b981';
      case 'warning':
        return '#f59e0b';
      case 'critical':
        return '#ef4444';
      default:
        return '#10b981';
    }
  }

  getStatusLabel(): string {
    switch (this.getGasStatus()) {
      case 'good':
        return 'NORMAL';
      case 'warning':
        return 'ADVERTENCIA';
      case 'critical':
        return 'PELIGRO';
      default:
        return 'NORMAL';
    }
  }

  getAlertIcon(type: string): string {
    switch (type) {
      case 'success':
        return '?';
      case 'warning':
        return '?';
      case 'critical':
        return '!';
      default:
        return '•';
    }
  }

  // Inicia la carga de datos y deja una actualizacion automatica cada 5 segundos.
  ngOnInit(): void {
    if (!this.isBrowser) return;
    this.loadLatestReading();
    this.loadControlState();
    this.refreshTimer = window.setInterval(() => {
      this.loadLatestReading();
      this.loadControlState();
    }, 5000);
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) {
      window.clearInterval(this.refreshTimer);
    }
  }

  // Trae la ultima lectura del sensor y actualiza el panel principal.
  private loadLatestReading(): void {
    this.airData.getReadings().subscribe({
      next: (readings: AirData[]) => {
        if (!readings.length) {
          return;
        }
        const latest = readings[0];
        this.gasSnapshot = {
          room: latest.habitacion,
          gasLevel: latest.sensores.nivel_gas,
          mq2Value: latest.sensores.mq2,
          sensorLabel: 'MQ-2'
        };
        this.lastUpdateTime = this.formatTime(latest.fecha_hora);
        this.cdr.detectChanges();
      },
      error: () => {
        // Mantener datos actuales si falla la carga
      }
    });
  }

  // Consulta el estado actual de ventana/ventilador/alarma en backend.
  private loadControlState(): void {
    this.airControl.getControl().subscribe({
      next: (control) => {
        this.controlState = control;
        this.controlStatusMessage = control.modo_manual
          ? 'Modo manual activo desde la app.'
          : 'Modo automatico activo.';
        this.cdr.detectChanges();
      },
      error: () => {
        this.controlStatusMessage = 'No se pudo sincronizar los controles.';
        this.cdr.detectChanges();
      }
    });
  }

  // Fuerza apertura de ventana en modo manual.
  openWindow(): void {
    this.airControl.updateControl({
      modo_manual: true,
      ventana: 'ABIERTA'
    }).subscribe({
      next: (control) => {
        this.controlState = control;
        this.controlStatusMessage = 'Ventana abierta desde la app.'
      }
    });
  }

  // Fuerza cierre de ventana en modo manual.
  closeWindow(): void {
    this.airControl.updateControl({
      modo_manual: true,
      ventana: 'CERRADA'
    }).subscribe({
      next: (control) => {
        this.controlState = control;
        this.controlStatusMessage = 'Ventana cerrada desde la app.'
      }
    });
  }

  // Apaga la alarma de forma manual.
  turnOffAlarm(): void {
    this.airControl.updateControl({
      modo_manual: true,
      alarma: 'OFF'
    }).subscribe({
      next: (control) => {
        this.controlState = control;
        this.controlStatusMessage = 'Alarma apagada desde la app.'
      }
    });
  }

  // Enciende el ventilador de forma manual.
  turnOnFan(): void {
    this.airControl.updateControl({
      modo_manual: true,
      ventilador: 'ON'
    }).subscribe({
      next: (control) => {
        this.controlState = control;
        this.controlStatusMessage = 'Ventilador encendido desde la app.'
      }
    });
  }

  // Apaga el ventilador de forma manual.
  turnOffFan(): void {
    this.airControl.updateControl({
      modo_manual: true,
      ventilador: 'OFF'
    }).subscribe({
      next: (control) => {
        this.controlState = control;
        this.controlStatusMessage = 'Ventilador apagado desde la app.'
      }
    });
  }

  // Convierte la fecha de backend a un formato corto y legible.
  private formatTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return this.lastUpdateTime;
    }
    return date.toLocaleString('es-PE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  // Cierra sesion y regresa al login.
  onLogout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  // En produccion, estos datos vendrian de una API.
}




