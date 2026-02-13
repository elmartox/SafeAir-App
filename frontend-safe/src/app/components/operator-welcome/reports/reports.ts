import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AirDataService, AirData } from '../../../services/air-data.service';
import jsPDF from 'jspdf';
import { Chart } from 'chart.js/auto';

/**
 * Componente Reportes / Exportacion de Datos
 */
@Component({
  selector: 'app-operator-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports.html',
  styleUrl: './reports.css',
})
export class OperatorReports implements OnInit, OnDestroy {
  isOperator: boolean = true;
  accessMessage: string = 'Acceso restringido: Solo operadores pueden ver reportes.';

  readings: AirData[] = [];
  filteredReadings: AirData[] = [];
  pagedReadings: AirData[] = [];

  filterStartDate: string = '';
  filterEndDate: string = '';
  filterAlertType: string = '';

  currentPage: number = 1;
  pageSize: number = 8;
  totalPages: number = 1;

  private refreshTimer?: number;
  private normalThreshold = 120;
  private warningThreshold = 300;
  private criticalThreshold = 500;
  private isBrowser: boolean;

  interestWeekLabels: string[] = [];
  interestWeekWindowOpens: number[] = [];
  interestMonthLabels: string[] = [];
  interestMonthMaxGas: number[] = [];
  interestMonthAlertTransitions: number[] = [];
  interestMonthMinGas: number[] = [];

  totalWindowOpensWeek = 0;
  maxGasMonth = 0;
  totalAlertTransitionsMonth = 0;
  minGasMonth = 0;

  private windowOpensChart?: Chart;
  private maxGasChart?: Chart;
  private alertTransitionsChart?: Chart;
  private minGasChart?: Chart;

  constructor(
    private airData: AirDataService,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  // Inicia validacion de acceso, carga datos y activa refresco automatico.
  ngOnInit(): void {
    console.log('Componente de Reportes iniciado');
    this.validateOperatorRole();
    if (this.isBrowser) {
      this.loadReadings();
      this.refreshTimer = window.setInterval(() => {
        this.loadReadings();
      }, 5000);
    }
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) {
      window.clearInterval(this.refreshTimer);
    }
    this.windowOpensChart?.destroy();
    this.maxGasChart?.destroy();
    this.alertTransitionsChart?.destroy();
    this.minGasChart?.destroy();
  }

  private validateOperatorRole(): void {
    const userRole = 'operator';
    this.isOperator = userRole === 'operator';

    if (!this.isOperator) {
      console.warn(this.accessMessage);
    }
  }

  // Aplica filtros del formulario (fecha/tipo) sin recargar la pagina.
  onFilterApply(event?: Event): void {
    if (event?.preventDefault) {
      event.preventDefault();
    }
    this.applyFilters();
  }

  onFilterReset(): void {
    this.filterStartDate = '';
    this.filterEndDate = '';
    this.filterAlertType = '';
    this.applyFilters();
  }

  onExportXLS(): void {
    const headers = [
      'fecha_hora',
      'habitacion',
      'nivel_gas',
      'mq2',
      'estado_sistema',
      'estado_alarma',
      'estado_ventana',
    ];
    const rows = this.filteredReadings.map((item) => [
      item.fecha_hora,
      item.habitacion,
      item.sensores.nivel_gas,
      item.sensores.mq2,
      item.controles.estado_sistema,
      item.controles.estado_alarma,
      item.controles.estado_ventana,
    ]);
    this.exportTableXLS(headers, rows, 'airdata-report.xls');
  }

  onExportPDF(): void {
    const doc = new jsPDF({ orientation: 'landscape' });
    const headers = [
      'Fecha/Hora',
      'Habitacion',
      'Nivel Gas',
      'MQ2',
      'Estado Sistema',
      'Estado Alarma',
      'Estado Ventana',
    ];
    const rows = this.filteredReadings.map((item) => [
      item.fecha_hora,
      item.habitacion,
      `${item.sensores.nivel_gas} ppm`,
      item.sensores.mq2,
      item.controles.estado_sistema,
      item.controles.estado_alarma,
      item.controles.estado_ventana,
    ]);

    doc.setFontSize(14);
    doc.text('Reporte de AirData', 14, 12);
    doc.setFontSize(10);
    const startY = 20;
    const colX = [14, 60, 105, 130, 155, 195, 235];

    headers.forEach((header, index) => {
      doc.text(header, colX[index], startY);
    });

    let y = startY + 8;
    rows.forEach((row) => {
      if (y > 190) {
        doc.addPage();
        y = 20;
      }
      row.forEach((cell, index) => {
        doc.text(String(cell), colX[index], y);
      });
      y += 8;
    });

    doc.save('airdata-report.pdf');
  }

  onExportJSON(): void {
    const json = JSON.stringify(this.filteredReadings, null, 2);
    this.downloadFile(json, 'airdata-report.json', 'application/json');
  }

  onPreviousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagination();
    }
  }

  onNextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagination();
    }
  }

  getAlertTypeLabel(reading: AirData): string {
    const status = this.mapStatus(reading.sensores.nivel_gas);
    if (status === 'alert') {
      return 'Peligro';
    }
    if (status === 'warning') {
      return 'Advertencia';
    }
    return 'Normal';
  }

  getLevelClass(reading: AirData): string {
    const status = this.mapStatus(reading.sensores.nivel_gas);
    if (status === 'alert') {
      return 'level-high';
    }
    if (status === 'warning') {
      return 'level-medium';
    }
    return 'level-low';
  }

  getStatusBadge(reading: AirData): { label: string; className: string } {
    if (reading.controles.estado_alarma !== 'APAGADA') {
      return { label: 'Alarma', className: 'status-pending' };
    }
    return { label: 'OK', className: 'status-normal' };
  }

  // Carga lecturas desde API y recalcula todo lo que depende de esos datos.
  private loadReadings(): void {
    this.airData.getReadings().subscribe({
      next: (data) => {
        this.readings = data || [];
        this.applyFilters();
        this.buildInterestReports();
      },
      error: () => {
        // Mantener datos actuales si falla la carga
      }
    });
  }

  // Filtra lecturas por rango, severidad y estado de alarma para la tabla.
  private applyFilters(): void {
    const start = this.filterStartDate ? new Date(this.filterStartDate) : null;
    const end = this.filterEndDate ? new Date(this.filterEndDate) : null;
    if (end) {
      end.setHours(23, 59, 59, 999);
    }

    this.filteredReadings = this.readings.filter((reading) => {
      const date = new Date(reading.fecha_hora);
      if (start && date < start) {
        return false;
      }
      if (end && date > end) {
        return false;
      }
      if (this.filterAlertType) {
        const status = this.mapStatus(reading.sensores.nivel_gas);
        if (this.filterAlertType === 'critical' && status !== 'alert') {
          return false;
        }
        if (this.filterAlertType === 'warning' && status !== 'warning') {
          return false;
        }
        if (this.filterAlertType === 'info' && status !== 'normal') {
          return false;
        }
      }
      if (reading.controles.estado_alarma === 'APAGADA') {
        return false;
      }
      return true;
    });

    this.currentPage = 1;
    this.updatePagination();
  }

  // Calcula paginacion actual de la tabla de reportes.
  private updatePagination(): void {
    this.totalPages = Math.max(1, Math.ceil(this.filteredReadings.length / this.pageSize));
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.pagedReadings = this.filteredReadings.slice(start, end);
  }

  private mapStatus(value: number): 'normal' | 'warning' | 'alert' {
    if (value >= this.criticalThreshold) {
      return 'alert';
    }
    if (value >= this.warningThreshold || value > this.normalThreshold) {
      return 'warning';
    }
    return 'normal';
  }

  // Descarga cualquier contenido generado en memoria (csv, json o html-xls).
  private downloadFile(content: string, filename: string, type: string): void {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  // Genera indicadores y series para los reportes de interes (semana/mes).
  private buildInterestReports(): void {
    const sorted = this.readings
      .slice()
      .sort((a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime());

    const weekSeries = this.buildWindowOpensSeries(sorted, 7);
    this.interestWeekLabels = weekSeries.labels;
    this.interestWeekWindowOpens = weekSeries.values;
    this.totalWindowOpensWeek = weekSeries.values.reduce((acc, v) => acc + v, 0);

    const maxSeries = this.buildMaxGasSeries(sorted, 30);
    this.interestMonthLabels = maxSeries.labels;
    this.interestMonthMaxGas = maxSeries.values;
    this.maxGasMonth = Math.max(...maxSeries.values, 0);

    const alertSeries = this.buildAlertTransitionsSeries(sorted, 30);
    this.interestMonthAlertTransitions = alertSeries.values;
    this.totalAlertTransitionsMonth = alertSeries.values.reduce((acc, v) => acc + v, 0);

    const minSeries = this.buildMinGasSeries(sorted, 30);
    this.interestMonthMinGas = minSeries.values;
    this.minGasMonth = minSeries.values.length ? Math.min(...minSeries.values) : 0;

    this.renderInterestCharts();
  }

  // Dibuja o refresca las 4 graficas de reportes de interes.
  private renderInterestCharts(): void {
    if (!this.isBrowser) return;
    window.setTimeout(() => {
      this.renderWindowOpensChart();
      this.renderMaxGasChart();
      this.renderAlertTransitionsChart();
      this.renderMinGasChart();
    }, 0);
  }

  private renderWindowOpensChart(): void {
    const canvas = document.getElementById('windowOpensChart') as HTMLCanvasElement | null;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const data = {
      labels: this.interestWeekLabels,
      datasets: [
        {
          label: 'Aperturas de ventana',
          data: this.interestWeekWindowOpens,
          backgroundColor: '#0ea5a3',
          borderRadius: 6
        }
      ]
    };

    if (this.windowOpensChart) {
      this.windowOpensChart.data = data;
      this.windowOpensChart.update();
      return;
    }

    this.windowOpensChart = new Chart(ctx, {
      type: 'bar',
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true }
        }
      }
    });
  }

  private renderMaxGasChart(): void {
    const canvas = document.getElementById('maxGasChart') as HTMLCanvasElement | null;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const data = {
      labels: this.interestMonthLabels,
      datasets: [
        {
          label: 'Maximo de gas (ppm)',
          data: this.interestMonthMaxGas,
          borderColor: '#f97316',
          backgroundColor: 'rgba(249, 115, 22, 0.25)',
          tension: 0.3,
          fill: true,
          pointRadius: 2
        }
      ]
    };

    if (this.maxGasChart) {
      this.maxGasChart.data = data;
      this.maxGasChart.update();
      return;
    }

    this.maxGasChart = new Chart(ctx, {
      type: 'line',
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { grid: { display: false } }, y: { beginAtZero: true } }
      }
    });
  }

  private renderAlertTransitionsChart(): void {
    const canvas = document.getElementById('alertTransitionsChart') as HTMLCanvasElement | null;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const data = {
      labels: this.interestMonthLabels,
      datasets: [
        {
          label: 'Entradas a alerta',
          data: this.interestMonthAlertTransitions,
          backgroundColor: '#ef4444',
          borderRadius: 6
        }
      ]
    };

    if (this.alertTransitionsChart) {
      this.alertTransitionsChart.data = data;
      this.alertTransitionsChart.update();
      return;
    }

    this.alertTransitionsChart = new Chart(ctx, {
      type: 'bar',
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { grid: { display: false } }, y: { beginAtZero: true } }
      }
    });
  }

  private renderMinGasChart(): void {
    const canvas = document.getElementById('minGasChart') as HTMLCanvasElement | null;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const data = {
      labels: this.interestMonthLabels,
      datasets: [
        {
          label: 'Minimo de gas (ppm)',
          data: this.interestMonthMinGas,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          tension: 0.3,
          fill: true,
          pointRadius: 2
        }
      ]
    };

    if (this.minGasChart) {
      this.minGasChart.data = data;
      this.minGasChart.update();
      return;
    }

    this.minGasChart = new Chart(ctx, {
      type: 'line',
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { grid: { display: false } }, y: { beginAtZero: true } }
      }
    });
  }

  // Cuenta cuantas veces la ventana paso a ABIERTA por dia.
  private buildWindowOpensSeries(readings: AirData[], days: number): { labels: string[]; values: number[] } {
    const series = this.buildEmptyDailySeries(days);
    const start = series.start;
    const map = new Map(series.keys.map((key) => [key, 0]));
    let lastState: string | null = null;

    readings.forEach((reading) => {
      const date = new Date(reading.fecha_hora);
      if (date < start) return;
      const key = series.toKey(date);
      const current = reading.controles.estado_ventana;
      if (key && current === 'ABIERTA' && lastState !== 'ABIERTA') {
        map.set(key, (map.get(key) || 0) + 1);
      }
      lastState = current;
    });

    return {
      labels: series.labels,
      values: series.keys.map((key) => map.get(key) || 0)
    };
  }

  // Cuenta transiciones de estado que entran en alerta por dia.
  private buildAlertTransitionsSeries(readings: AirData[], days: number): { labels: string[]; values: number[] } {
    const series = this.buildEmptyDailySeries(days);
    const start = series.start;
    const map = new Map(series.keys.map((key) => [key, 0]));
    let lastStatus: 'normal' | 'warning' | 'alert' | null = null;

    readings.forEach((reading) => {
      const date = new Date(reading.fecha_hora);
      if (date < start) return;
      const key = series.toKey(date);
      const status = this.mapStatus(reading.sensores.nivel_gas);
      if (key && status === 'alert' && lastStatus !== 'alert') {
        map.set(key, (map.get(key) || 0) + 1);
      }
      lastStatus = status;
    });

    return {
      labels: series.labels,
      values: series.keys.map((key) => map.get(key) || 0)
    };
  }

  // Calcula maximo de gas por dia.
  private buildMaxGasSeries(readings: AirData[], days: number): { labels: string[]; values: number[] } {
    const series = this.buildEmptyDailySeries(days);
    const start = series.start;
    const map = new Map(series.keys.map((key) => [key, 0]));

    readings.forEach((reading) => {
      const date = new Date(reading.fecha_hora);
      if (date < start) return;
      const key = series.toKey(date);
      if (!key) return;
      const current = map.get(key) || 0;
      map.set(key, Math.max(current, reading.sensores.nivel_gas));
    });

    return {
      labels: series.labels,
      values: series.keys.map((key) => map.get(key) || 0)
    };
  }

  // Calcula minimo de gas por dia.
  private buildMinGasSeries(readings: AirData[], days: number): { labels: string[]; values: number[] } {
    const series = this.buildEmptyDailySeries(days);
    const start = series.start;
    const map = new Map(series.keys.map((key) => [key, Infinity]));

    readings.forEach((reading) => {
      const date = new Date(reading.fecha_hora);
      if (date < start) return;
      const key = series.toKey(date);
      if (!key) return;
      const current = map.get(key) ?? Infinity;
      map.set(key, Math.min(current, reading.sensores.nivel_gas));
    });

    return {
      labels: series.labels,
      values: series.keys.map((key) => {
        const value = map.get(key);
        return value === undefined || value === Infinity ? 0 : value;
      })
    };
  }

  // Crea base de dias (labels + keys) para construir series diarias completas.
  private buildEmptyDailySeries(days: number): {
    labels: string[];
    keys: string[];
    start: Date;
    toKey: (date: Date) => string | null;
  } {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));
    const labels: string[] = [];
    const keys: string[] = [];

    for (let i = 0; i < days; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const key = date.toISOString().slice(0, 10);
      keys.push(key);
      labels.push(date.toLocaleDateString('es-PE', { month: 'short', day: '2-digit' }));
    }

    return {
      labels,
      keys,
      start,
      toKey: (date: Date) => {
        const key = date.toISOString().slice(0, 10);
        return keys.includes(key) ? key : null;
      }
    };
  }

  // Convierte filas de tabla a texto CSV escapando comas y comillas.
  private buildCsv(headers: string[], rows: (string | number)[][]): string {
    const escape = (value: string | number) => {
      const str = String(value ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    return [headers.map(escape).join(','), ...rows.map((row) => row.map(escape).join(','))].join('\n');
  }

  private exportTableCSV(headers: string[], rows: (string | number)[][], filename: string): void {
    const csv = this.buildCsv(headers, rows);
    this.downloadFile(csv, filename, 'text/csv');
  }

  private exportTableXLS(headers: string[], rows: (string | number)[][], filename: string): void {
    const tableRows = rows
      .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`)
      .join('');
    const html = `<table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${tableRows}</tbody></table>`;
    this.downloadFile(html, filename, 'application/vnd.ms-excel');
  }

  // Exporta una grafica y su tabla de respaldo a un PDF horizontal.
  private exportChartPDF(
    title: string,
    chart: Chart | undefined,
    headers: string[],
    rows: (string | number)[][],
    filename: string
  ): void {
    const doc = new jsPDF({ orientation: 'landscape' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    const chartWidth = pageWidth - margin * 2;

    doc.setFontSize(14);
    doc.text(title, margin, 14);

    let y = 22;
    if (chart) {
      const canvas = chart.canvas;
      const ratio = canvas && canvas.width ? canvas.height / canvas.width : 0.4;
      const rawHeight = chartWidth * (ratio || 0.4);
      const chartHeight = Math.max(60, Math.min(rawHeight, 90));
      const image = chart.toBase64Image();
      doc.addImage(image, 'PNG', margin, y, chartWidth, chartHeight);
      y += chartHeight + 10;
    }

    doc.setFontSize(10);
    const colX = headers.map((_, index) => 14 + index * 30);
    headers.forEach((header, index) => {
      doc.text(header, colX[index], y);
    });
    y += 6;

    rows.forEach((row) => {
      if (y > 275) {
        doc.addPage();
        y = 20;
      }
      row.forEach((cell, index) => {
        doc.text(String(cell), colX[index], y);
      });
      y += 6;
    });

    doc.save(filename);
  }

  onExportWindowCSV(): void {
    const headers = ['Fecha', 'Aperturas de ventana'];
    const rows = this.interestWeekLabels.map((label, index) => [label, this.interestWeekWindowOpens[index]]);
    this.exportTableCSV(headers, rows, 'aperturas-ventana-semana.csv');
  }

  onExportWindowXLS(): void {
    const headers = ['Fecha', 'Aperturas de ventana'];
    const rows = this.interestWeekLabels.map((label, index) => [label, this.interestWeekWindowOpens[index]]);
    this.exportTableXLS(headers, rows, 'aperturas-ventana-semana.xls');
  }

  onExportWindowPDF(): void {
    const headers = ['Fecha', 'Aperturas'];
    const rows = this.interestWeekLabels.map((label, index) => [label, this.interestWeekWindowOpens[index]]);
    this.exportChartPDF('Aperturas de ventana (semana)', this.windowOpensChart, headers, rows, 'aperturas-ventana-semana.pdf');
  }

  onExportMaxGasCSV(): void {
    const headers = ['Fecha', 'Maximo gas (ppm)'];
    const rows = this.interestMonthLabels.map((label, index) => [label, this.interestMonthMaxGas[index]]);
    this.exportTableCSV(headers, rows, 'maximo-gas-mes.csv');
  }

  onExportMaxGasXLS(): void {
    const headers = ['Fecha', 'Maximo gas (ppm)'];
    const rows = this.interestMonthLabels.map((label, index) => [label, this.interestMonthMaxGas[index]]);
    this.exportTableXLS(headers, rows, 'maximo-gas-mes.xls');
  }

  onExportMaxGasPDF(): void {
    const headers = ['Fecha', 'Maximo gas'];
    const rows = this.interestMonthLabels.map((label, index) => [label, this.interestMonthMaxGas[index]]);
    this.exportChartPDF('Maximo de gas (mes)', this.maxGasChart, headers, rows, 'maximo-gas-mes.pdf');
  }

  onExportAlertCSV(): void {
    const headers = ['Fecha', 'Entradas a alerta'];
    const rows = this.interestMonthLabels.map((label, index) => [label, this.interestMonthAlertTransitions[index]]);
    this.exportTableCSV(headers, rows, 'entradas-alerta-mes.csv');
  }

  onExportAlertXLS(): void {
    const headers = ['Fecha', 'Entradas a alerta'];
    const rows = this.interestMonthLabels.map((label, index) => [label, this.interestMonthAlertTransitions[index]]);
    this.exportTableXLS(headers, rows, 'entradas-alerta-mes.xls');
  }

  onExportAlertPDF(): void {
    const headers = ['Fecha', 'Entradas a alerta'];
    const rows = this.interestMonthLabels.map((label, index) => [label, this.interestMonthAlertTransitions[index]]);
    this.exportChartPDF('Entradas a alerta (mes)', this.alertTransitionsChart, headers, rows, 'entradas-alerta-mes.pdf');
  }

  onExportMinGasCSV(): void {
    const headers = ['Fecha', 'Minimo gas (ppm)'];
    const rows = this.interestMonthLabels.map((label, index) => [label, this.interestMonthMinGas[index]]);
    this.exportTableCSV(headers, rows, 'minimo-gas-mes.csv');
  }

  onExportMinGasXLS(): void {
    const headers = ['Fecha', 'Minimo gas (ppm)'];
    const rows = this.interestMonthLabels.map((label, index) => [label, this.interestMonthMinGas[index]]);
    this.exportTableXLS(headers, rows, 'minimo-gas-mes.xls');
  }

  onExportMinGasPDF(): void {
    const headers = ['Fecha', 'Minimo gas'];
    const rows = this.interestMonthLabels.map((label, index) => [label, this.interestMonthMinGas[index]]);
    this.exportChartPDF('Minimo de gas (mes)', this.minGasChart, headers, rows, 'minimo-gas-mes.pdf');
  }
}
