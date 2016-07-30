/// <reference path="../typings/ref.d.ts" />

import { Injectable, OnInit } from '@angular/core';
import { Http, Response } from '@angular/http';
import { Observable } from 'rxjs/Observable';


// const _apiRoot = 'http://192.168.1.157:3002';
const _apiRoot = 'http://nskgortrans.info';

@Injectable()
export /**
 * GortransInfoApiService
 */
class GortransInfoApiService implements OnInit {

	constructor(private _http: Http)
	{
	}

	public ngOnInit (): void
	{
	}

	// get list of changes from .info
	public synchronize (timestamp: number): Observable<upToDateVerification>
	{
		return this._http
			.get( _apiRoot + '/sync?' + 'timestamp=' + timestamp)
			.map(
				(resp: Response): upToDateVerification => <upToDateVerification>resp.json()
			)
			.catch( this._handleHttpError )
			;
	}

	private _handleHttpError (
		err: Response,
		caught: Observable<any>
	): Observable<any>
	{
		return Observable.throw(err || 'Server error');
	}
}