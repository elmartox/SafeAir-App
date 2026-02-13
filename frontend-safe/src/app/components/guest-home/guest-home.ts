import { Component } from '@angular/core';
import { GuestHeaderComponent } from './sections/header/header.component';
import { GuestHeroComponent } from './sections/hero/hero.component';
import { GuestActionsComponent } from './sections/actions/actions.component';
import { GuestInfoComponent } from './sections/info/info.component';

@Component({
  selector: 'app-guest-home',
  standalone: true,
  imports: [GuestHeaderComponent, GuestHeroComponent, GuestActionsComponent, GuestInfoComponent],
  templateUrl: './guest-home.html',
  styleUrl: './guest-home.css'
})
export class GuestHome {}
