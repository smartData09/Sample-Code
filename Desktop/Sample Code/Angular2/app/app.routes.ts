import {provideRouter, RouterConfig} from '@angular/router';

import {HomeComponent} from './home.component';
import {SigninComponent} from './signin.component';
import {DashboardComponent} from './dashboard.component';
import {LoginComponent} from './login.component';
import {SignupComponent} from './signup.component';
import {AdminDashboardComponent} from './admindash.component';


export const routes: RouterConfig = [
	{ path: '', component: LoginComponent},
	{ path: 'signup', component: SignupComponent},
	{ path: 'admindashboard' , component: AdminDashboardComponent},
	{ path: 'home', component: HomeComponent },
	{ path: 'signin', component: SigninComponent },
	{ path: 'dashboard', component: DashboardComponent }
];

export const APP_ROUTER_PROVIDERS = [
	provideRouter(routes)
];