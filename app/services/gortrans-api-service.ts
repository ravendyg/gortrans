/// <reference path="../typings/ref.d.ts" />

import { Injectable } from '@angular/core';
import { Http, Response } from '@angular/http';
import { Observable } from 'rxjs/Observable';

@Injectable()
export /**
 * GortransApiService
 */
class GortransApiService {

	private _echoUrl: string;
	private _routesApi: string;

	private _routes: routeType [];



	constructor(private _http: Http)
	{
		this._echoUrl = 'https://excur.info:3006';
		this._routesApi = 'http://maps.nskgortrans.ru/listmarsh.php?r&r=true';
	}

	public getRoutes (): Observable<routeType []>
	{
		const search = this._routesApi;
		return this._http
			.get( this._echoUrl, { search })
			.map( (resp: Response) => <routeType []>resp.json() )
			.catch( this._handleHttpError )
			;
	}

	private _handleHttpError (
		err: Response,
		caught: Observable<any>
	): Observable<any>
	{
		console.log(err);
		return Observable.throw(err.json().error || 'Server error');
	}
}