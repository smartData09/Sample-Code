import {Component} from '@angular/core';
import {Http, Headers, RequestOptions} from '@angular/http';
import {ROUTER_DIRECTIVES, Router} from '@angular/router';

@Component({
	selector: 'signup',
	templateUrl: 'app/templates/signup.component.html',
	styleUrls: ['app/css/signup.component.css']
	directives: [ROUTER_DIRECTIVES]
})

export class SignupComponent { }