import {Component} from '@angular/core';
import {Http, Headers, RequestOptions} from '@angular/http';
import {ROUTER_DIRECTIVES, Router} from '@angular/router';

@Component({
	selector: 'login',
	templateUrl: 'app/templates/login.component.html',
	styleUrls: ['app/css/login.component.css'],
	directives: [ROUTER_DIRECTIVES],
})

export class LoginComponent { }