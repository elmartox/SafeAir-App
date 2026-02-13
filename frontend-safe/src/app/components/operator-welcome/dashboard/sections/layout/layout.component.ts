import { Component, OnDestroy, OnInit, Inject } from '@angular/core';
import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { Chart } from 'chart.js/auto';
import { AirDataService, AirData } from '../../../../../services/air-data.service';
import { AirControlService, AirControl } from '../../../../../services/air-control.service';

interface RoomSummary {
  room: string;
  lastReading: string;
  gasLevel: number;
  status: 'normal' | 'warning' | 'alert';
}

interface DonutSegment {
  label: string;
  value: number;
  color: string;
  dashArray: string;
  dashOffset: string;
  percent: number;
}

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css',
})
export class DashboardLayoutComponent implements OnInit, OnDestroy {
  rooms: RoomSummary[] = [];
  readings: AirData[] = [];
  latestReading?: AirData;
  controlState?: AirControl;
  selectedRoom: string = '';
  roomReadings: AirData[] = [];
  donutSegments: DonutSegment[] = [];
  donutTotal: number = 0;
  overallStatus: 'normal' | 'warning' | 'alert' = 'normal';

  donutLabels: string[] = ['Normal', 'Advertencia', 'Peligro'];
  donutValues: number[] = [0, 0, 0];
  donutColors: string[] = ['#22c55e', '#f59e0b', '#ef4444'];

  barLabels: string[] = [];
  barValues: number[] = [];
  barColors: string[] = [];

  lineLabels: string[] = [];
  lineGasValues: number[] = [];
  lineMq2Values: number[] = [];
  lineAvgValues: number[] = [];

  private donutChart?: Chart;
  private barChart?: Chart;
  private lineChart?: Chart;
  private refreshTimer?: number;
  private themeObserver?: MutationObserver;
  private normalThreshold = 120;
  private warningThreshold = 300;
  private criticalThreshold = 500;
  private manualOverrideMs = 90_000;
  private isBrowser: boolean;
  constructor(
    private airData: AirDataService,
    private airControl: AirControlService,
    @Inject(DOCUMENT) private document: Document,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  // Arranca carga de datos y refresco automatico del tablero.
  ngOnInit(): void {
    if (this.isBrowser) {
      this.loadDashboardData();
      this.loadControlState();
      this.refreshTimer = window.setInterval(() => {
        this.loadDashboardData();
        this.loadControlState();
      }, 5000);

      this.themeObserver = new MutationObserver(() => {
        this.updateChartTheme();
      });
      this.themeObserver.observe(this.document.documentElement, {
        attributes: true,
        attributeFilter: ['class']
      });
    }
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) {
      window.clearInterval(this.refreshTimer);
    }
    this.themeObserver?.disconnect();
    this.donutChart?.destroy();
    this.barChart?.destroy();
    this.lineChart?.destroy();
  }

  // Trae lecturas, ordena por fecha y reconstruye resumen + graficas.
  private loadDashboardData(): void {
    this.airData.getReadings().subscribe({
      next: (readings: AirData[]) => {
        const safeReadings = readings || [];
        this.readings = safeReadings
          .slice()
          .sort((a, b) => new Date(b.fecha_hora).getTime() - new Date(a.fecha_hora).getTime());
        this.latestReading = this.readings[0];
        this.selectedRoom =
          this.selectedRoom || this.latestReading?.habitacion || this.readings[0]?.habitacion || 'Cocina';
        this.roomReadings = this.readings
          .filter((item) => item.habitacion === this.selectedRoom)
          .slice()
          .sort((a, b) => new Date(b.fecha_hora).getTime() - new Date(a.fecha_hora).getTime());
        if (!this.roomReadings.length) {
          this.roomReadings = this.readings;
        }
        this.buildRoomSummaries();
        this.buildCharts();
      },
      error: () => {
        // Mantener datos actuales si falla la carga
      }
    });
  }

  // Sincroniza estado de controles manuales (ventana/alarma).
  private loadControlState(): void {
    this.airControl.getControl().subscribe({
      next: (control) => {
        this.controlState = control;
      },
      error: () => {
        // Mantener estado actual si falla la carga
      }
    });
  }

  // Atajo de accion manual para abrir ventana desde dashboard.
  openWindow(): void {
    this.airControl.updateControl({
      modo_manual: true,
      ventana: 'ABIERTA'
    }).subscribe({
      next: (control) => {
        this.controlState = control;
      }
    });
  }

  // Atajo de accion manual para apagar alarma desde dashboard.
  turnOffAlarm(): void {
    this.airControl.updateControl({
      modo_manual: true,
      alarma: 'OFF'
    }).subscribe({
      next: (control) => {
        this.controlState = control;
      }
    });
  }

  // Construye la tarjeta principal con la lectura mas reciente del ambiente activo.
  private buildRoomSummaries(): void {
    const latest = this.roomReadings[0] || this.latestReading;
    if (!latest) {
      this.rooms = [];
      this.overallStatus = 'normal';
      return;
    }

    const gasLevel = latest.sensores.nivel_gas;
    const roomStatus = this.mapStatus(gasLevel);
    this.rooms = [{
      room: latest.habitacion,
      lastReading: this.formatDateTime(latest.fecha_hora),
      gasLevel,
      status: roomStatus
    }];
    this.overallStatus = roomStatus;
  }

  // Prepara todas las series que alimentan las 3 graficas.
  private buildCharts(): void {
    const recent = this.roomReadings.slice(0, 20).reverse();
    this.buildDonut(recent);
    this.buildLineSeries(recent);
    this.buildBarSeries(recent);
    this.renderCharts();
  }

  // Crea la distribucion por niveles (normal, advertencia, peligro) para el donut.
  private buildDonut(items: AirData[]): void {
    const counts = { normal: 0, warning: 0, alert: 0 };
    items.forEach((item) => {
      counts[this.mapStatus(item.sensores.nivel_gas)] += 1;
    });

    this.donutValues = [counts.normal, counts.warning, counts.alert];

    const total = Math.max(1, counts.normal + counts.warning + counts.alert);
    this.donutTotal = total;

    const segments = [
      { label: 'Normal', value: counts.normal, color: this.donutColors[0] },
      { label: 'Advertencia', value: counts.warning, color: this.donutColors[1] },
      { label: 'Peligro', value: counts.alert, color: this.donutColors[2] }
    ];

    const radius = 42;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;

    this.donutSegments = segments.map((segment) => {
      const percent = segment.value / total;
      const length = percent * circumference;
      const dashArray = `${length.toFixed(2)} ${(circumference - length).toFixed(2)}`;
      const dashOffset = (-offset).toFixed(2);
      offset += length;
      return {
        label: segment.label,
        value: segment.value,
        color: segment.color,
        dashArray,
        dashOffset,
        percent: Math.round(percent * 100)
      };
    });
  }

  // Arma serie temporal de gas, MQ-2 y promedio movil para ver tendencia.
  private buildLineSeries(items: AirData[]): void {
    const labels = items.map((item) => this.formatShortTime(item.fecha_hora));
    const values = items.map((item) => item.sensores.nivel_gas);
    const mq2Values = items.map((item) => item.sensores.mq2);

    const safeValues = values.length ? values : [0, 0];
    const safeMq2 = mq2Values.length ? mq2Values : [0, 0];
    const avgValues = safeValues.map((value, index, array) => {
      const start = Math.max(0, index - 2);
      const slice = array.slice(start, index + 1);
      const sum = slice.reduce((acc, current) => acc + current, 0);
      return sum / slice.length;
    });

    this.lineLabels = labels.length ? labels : ['--', '--'];
    this.lineGasValues = safeValues;
    this.lineMq2Values = safeMq2;
    this.lineAvgValues = avgValues;
  }

  private buildBarSeries(items: AirData[]): void {
    const sample = items.slice(-8);
    this.barLabels = sample.map((item) => this.formatShortTime(item.fecha_hora));
    this.barValues = sample.map((item) => item.sensores.nivel_gas);
    this.barColors = sample.map((item) => {
      const status = this.mapStatus(item.sensores.nivel_gas);
      return status === 'alert' ? '#ef4444' : status === 'warning' ? '#f59e0b' : '#22c55e';
    });
  }

  // Renderiza o refresca graficas una vez que Angular termino de pintar el DOM.
  private renderCharts(): void {
    if (!this.isBrowser) return;
    window.setTimeout(() => {
      this.renderDonutChart();
      this.renderBarChart();
      this.renderLineChart();
    }, 0);
  }

  // Ajusta colores de ejes y grilla cuando cambia tema claro/oscuro.
  private updateChartTheme(): void {
    if (!this.isBrowser) return;
    const palette = this.getChartPalette();

    if (this.barChart) {
      this.barChart.options = {
        ...this.barChart.options,
        scales: {
          x: { grid: { display: false }, ticks: { color: palette.axis } },
          y: { beginAtZero: true, grid: { color: palette.grid }, ticks: { color: palette.axis } }
        }
      };
      this.barChart.update();
    }

    if (this.lineChart) {
      this.lineChart.options = {
        ...this.lineChart.options,
        plugins: {
          legend: { position: 'bottom', labels: { color: palette.axis } }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: palette.axis } },
          y: { beginAtZero: true, grid: { color: palette.grid }, ticks: { color: palette.axis } }
        }
      };
      this.lineChart.update();
    }

    if (this.donutChart) {
      this.donutChart.options = {
        ...this.donutChart.options,
        plugins: {
          legend: { display: false },
          tooltip: {
            bodyColor: palette.text,
            titleColor: palette.text
          }
        }
      };
      this.donutChart.update();
    }
  }

  private getChartPalette(): { axis: string; grid: string; text: string; panel: string } {
    const isLight = this.document.documentElement.classList.contains('theme-light');
    return {
      axis: isLight ? '#475569' : '#cbd5f5',
      grid: isLight ? 'rgba(148, 163, 184, 0.25)' : 'rgba(148, 163, 184, 0.2)',
      text: isLight ? '#0f172a' : '#e2e8f0',
      panel: isLight ? '#ffffff' : '#0f172a'
    };
  }

  private renderDonutChart(): void {
    const canvas = document.getElementById('donutChart') as HTMLCanvasElement | null;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const data = {
      labels: this.donutLabels,
      datasets: [
        {
          data: this.donutValues,
          backgroundColor: this.donutColors,
          borderWidth: 0,
          hoverOffset: 6
        }
      ]
    };

    if (this.donutChart) {
      this.donutChart.data = data;
      this.donutChart.update();
      return;
    }

    this.donutChart = new Chart(ctx, {
      type: 'doughnut',
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => `${context.label}: ${context.parsed}`
            }
          }
        }
      }
    });
  }

  private renderBarChart(): void {
    const canvas = document.getElementById('barChart') as HTMLCanvasElement | null;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const palette = this.getChartPalette();
    const data = {
      labels: this.barLabels,
      datasets: [
        {
          label: 'Nivel de gas (ppm)',
          data: this.barValues,
          backgroundColor: this.barColors,
          borderRadius: 6
        }
      ]
    };

    if (this.barChart) {
      this.barChart.data = data;
      this.barChart.options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => `${context.parsed.y} ppm`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: palette.axis }
          },
          y: {
            beginAtZero: true,
            grid: { color: palette.grid },
            ticks: { color: palette.axis }
          }
        }
      };
      this.barChart.update();
      return;
    }

    this.barChart = new Chart(ctx, {
      type: 'bar',
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => `${context.parsed.y} ppm`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: palette.axis }
          },
          y: {
            beginAtZero: true,
            grid: { color: palette.grid },
            ticks: { color: palette.axis }
          }
        }
      }
    });
  }

  private renderLineChart(): void {
    const canvas = document.getElementById('lineChart') as HTMLCanvasElement | null;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const palette = this.getChartPalette();
    const data = {
      labels: this.lineLabels,
      datasets: [
        {
          label: 'Gas',
          data: this.lineGasValues,
          borderColor: '#38bdf8',
          backgroundColor: 'rgba(56, 189, 248, 0.2)',
          tension: 0.35,
          pointRadius: 2,
          pointHoverRadius: 4
        },
        {
          label: 'MQ-2',
          data: this.lineMq2Values,
          borderColor: '#fbbf24',
          backgroundColor: 'rgba(251, 191, 36, 0.2)',
          tension: 0.35,
          pointRadius: 2,
          pointHoverRadius: 4
        },
        {
          label: 'Promedio',
          data: this.lineAvgValues,
          borderColor: '#34d399',
          backgroundColor: 'rgba(52, 211, 153, 0.2)',
          borderDash: [6, 4],
          tension: 0.35,
          pointRadius: 0
        }
      ]
    };

    if (this.lineChart) {
      this.lineChart.data = data;
      this.lineChart.options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: palette.axis }
          },
          tooltip: {
            callbacks: {
              label: (context) => `${context.dataset.label}: ${context.parsed.y} ppm`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: palette.axis }
          },
          y: {
            beginAtZero: true,
            grid: { color: palette.grid },
            ticks: { color: palette.axis }
          }
        }
      };
      this.lineChart.update();
      return;
    }

    this.lineChart = new Chart(ctx, {
      type: 'line',
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: palette.axis }
          },
          tooltip: {
            callbacks: {
              label: (context) => `${context.dataset.label}: ${context.parsed.y} ppm`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: palette.axis }
          },
          y: {
            beginAtZero: true,
            grid: { color: palette.grid },
            ticks: { color: palette.axis }
          }
        }
      }
    });
  }

  getStatusLabel(status: RoomSummary['status']): string {
    switch (status) {
      case 'alert':
        return 'Peligro';
      case 'warning':
        return 'Advertencia';
      default:
        return 'Normal';
    }
  }

  getOverallLabel(): string {
    return this.overallStatus === 'alert'
      ? 'Peligro'
      : this.overallStatus === 'warning'
      ? 'Advertencia'
      : 'Normal';
  }

  private mapStatus(value: number): RoomSummary['status'] {
    if (value >= this.criticalThreshold) {
      return 'alert';
    }
    if (value >= this.warningThreshold || value > this.normalThreshold) {
      return 'warning';
    }
    return 'normal';
  }

  private formatDateTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleString('es-PE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private formatShortTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleTimeString('es-PE', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Muestra estado de alarma priorizando override manual reciente.
  getAlarmStatus(): string {
    if (this.isManualOverrideActive()) {
      return this.controlState?.alarma || this.latestReading?.controles?.estado_alarma || 'SIN';
    }
    return this.getAutoAlarmStatus();
  }

  // Muestra estado de ventana priorizando override manual reciente.
  getWindowStatus(): string {
    if (this.isManualOverrideActive()) {
      return this.controlState?.ventana || this.latestReading?.controles?.estado_ventana || 'SIN DATOS';
    }
    return this.getAutoWindowStatus();
  }

  // Evita que un override manual quede activo indefinidamente.
  private isManualOverrideActive(): boolean {
    if (!this.controlState?.modo_manual) return false;
    const updatedAt = this.controlState?.updated_at;
    if (!updatedAt) return false;
    const diff = Date.now() - new Date(updatedAt).getTime();
    return diff >= 0 && diff <= this.manualOverrideMs;
  }

  private getAutoAlarmStatus(): string {
    const fromReading = this.latestReading?.controles?.estado_alarma;
    if (fromReading) return fromReading;
    const gasLevel = this.latestReading?.sensores?.nivel_gas;
    const status = gasLevel !== undefined ? this.mapStatus(gasLevel) : undefined;
    if (status === 'alert') return 'ON';
    if (status === 'warning' || status === 'normal') return 'OFF';
    return this.controlState?.alarma || 'SIN';
  }

  private getAutoWindowStatus(): string {
    const fromReading = this.latestReading?.controles?.estado_ventana;
    if (fromReading) return fromReading;
    const gasLevel = this.latestReading?.sensores?.nivel_gas;
    const status = gasLevel !== undefined ? this.mapStatus(gasLevel) : undefined;
    if (status === 'alert') return 'ABIERTA';
    if (status === 'warning' || status === 'normal') return 'CERRADA';
    return this.controlState?.ventana || 'SIN DATOS';
  }
}
