import {Component} from '@angular/core';
import {Http, Headers, RequestOptions} from '@angular/http';
import {ROUTER_DIRECTIVES, Router} from '@angular/router';

@Component({
	selector: 'admindash',
	templateUrl: 'app/templates/admindash.component.html',
	styleUrls: ['app/css/admindash.component.css']
	directives: [ROUTER_DIRECTIVES]
})

export class AdminDashboardComponent { }