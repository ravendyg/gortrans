/// <reference path="../typings/ref.d.ts" />

import { Injectable, OnInit } from '@angular/core';
import { Http, Response } from '@angular/http';
import { Observable } from 'rxjs/Observable';

@Injectable()
export /**
 * GortransInfoApiService
 */
class GortransInfoApiService implements OnInit {

	private _echoUrl: string;
	private _listRoutes: string;
	private _listTrasses: string;
	private _listMarkers: string;

	private _routes: routesType;

	private _lines: { [id: string]: trassPoint [] };

	constructor(private _http: Http)
	{
		this._echoUrl = 'http://excur.info:3006';
		this._listRoutes = '?url=http://maps.nskgortrans.ru/listmarsh.php?r&r=true';
		this._lines = {};
	}

	public ngOnInit (): void
	{
	}

		// get list of routes from gortrans
	public synchronize (timestamp: number): Observable<routesListResponse []>
	{
		return this._http
			.get( this._echoUrl + this._listRoutes + '&timestamp=' + timestamp)
			.map( (resp: Response) => <routesListResponse []>resp.json() )
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