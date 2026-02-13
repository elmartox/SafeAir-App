import { Component, signal } from '@angular/core';
import { RouterOutlet, RouterModule } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterModule], // <-- agrega RouterModule aquí
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('frontend-safe');
}
