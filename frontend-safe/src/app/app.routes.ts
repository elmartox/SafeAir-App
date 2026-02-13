import { Routes } from '@angular/router';
import { GuestHome } from './components/guest-home/guest-home';
import { Registro } from './components/registro/registro';
import { Login } from './components/login/login';
import { PasswordRecovery } from './components/password-recovery/password-recovery';
import { OperatorWelcome } from './components/operator-welcome/operator-welcome';
import { OperatorDashboard } from './components/operator-welcome/dashboard/dashboard';
import { OperatorReports } from './components/operator-welcome/reports';
import { OperatorSettings } from './components/operator-welcome/settings/settings';
import { GuestWindow } from './components/guest-window/guest-window';

export const routes: Routes = [
	{ path: '', component: GuestHome },
	{ path: 'guest-window', component: GuestWindow },
	{ path: 'registro', component: Registro },
	{ path: 'login', component: Login },
	{ path: 'recuperar-contraseña', component: PasswordRecovery },
	{ path: 'operator-welcome', component: OperatorWelcome, children: [
		{ path: 'dashboard', component: OperatorDashboard },
		{ path: 'reports', component: OperatorReports },
		{ path: 'settings', component: OperatorSettings },
		{ path: '', redirectTo: 'dashboard', pathMatch: 'full' }
	]},
	{ path: '**', redirectTo: '' }
];
