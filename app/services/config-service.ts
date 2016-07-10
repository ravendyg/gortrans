/// <reference path="../typings/ref.d.ts" />

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';

@Injectable()
export /**
 * ConfigService
 */
class ConfigService {

	public rootUrl: string;
	public listRoutes: string;
	public listTrasses: string;
	public listMarkers: string;

	constructor () {
		this.rootUrl = '';
		this.listRoutes  = 'http://maps.nskgortrans.ru/listmarsh.php?r&r=true';
		this.listTrasses = 'http://maps.nskgortrans.ru/trasses.php?r=';
		this.listMarkers = 'http://maps.nskgortrans.ru/markers.php?r=';
	}

	public changeRoot (newUrl: string): void
	{
		this.rootUrl = newUrl;
	}
}