import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';


export interface AirControl {

  _id?: string;
  modo_manual: boolean;
  ventana: 'ABIERTA' | 'MEDIA' | 'CERRADA';
  ventilador: 'ON' | 'OFF';
  alarma: 'ON' | 'OFF';
  updated_at?: string;
}

// Tipo para enviar actualizaciones parciales:
// permite mandar solo los campos que cambiaron.
export type AirControlPatch = Partial<Pick<AirControl, 'modo_manual' | 'ventana' | 'ventilador' | 'alarma'>>;

@Injectable({ providedIn: 'root' })
export class AirControlService {
  // Endpoint principal del backend para consultar y actualizar el control de aire.
  private API = 'http://3.145.133.233:3000/api/air-control';

  constructor(private http: HttpClient) {}

  // Obtiene el estado actual del sistema de control de aire.
  getControl(): Observable<AirControl> {
    return this.http.get<AirControl>(this.API);
  }

  // Envía cambios al backend (solo los campos que se quieran modificar).
  updateControl(patch: AirControlPatch): Observable<AirControl> {
    return this.http.put<AirControl>(this.API, patch);
  }
}
