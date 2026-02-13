import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AirData {
  // ID del registro (lo asigna la base de datos).
  _id?: string;
  // Fecha y hora en que se tomó la lectura.
  fecha_hora: string;
  // Ambiente o habitación donde está el sensor.
  habitacion: string;
  // Valores medidos por el sensor.
  sensores: {
    nivel_gas: number;
    mq2: number;
  };
  // Estado de los actuadores en esa lectura.
  controles: {
    estado_sistema: string;
    estado_alarma: string;
    estado_ventana: string;
  };
}

@Injectable({ providedIn: 'root' })
export class AirDataService {
  private API = 'http://3.145.133.233:3000/api/air-data';

  constructor(private http: HttpClient) {}

  // Trae el historial de lecturas desde el backend.
  getReadings(): Observable<AirData[]> {
    return this.http.get<AirData[]>(this.API);
  }
}
