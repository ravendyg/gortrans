/// <reference path="../typings/ref.d.ts" />

import { Injectable, OnInit } from '@angular/core';
import { Http, Response } from '@angular/http';
import { Observable } from 'rxjs/Observable';

@Injectable()
export /**
 * GortransApiService
 */
class GortransApiService implements OnInit{

	private _echoUrl: string;
	private _listmarsh: string;

	private _routes: routesType;


	constructor(private _http: Http)
	{
		this._echoUrl = 'http://excur.info:3006';
		this._listmarsh = '?url=http://maps.nskgortrans.ru/listmarsh.php?r&r=true';
	}

	public ngOnInit (): void
	{
	}

	public getRoutes (cb): void
	{
		if (this._routes)
		{
			cb(this._routes);
		}
		else
		{
			this._getRoutes()
			.subscribe(
        (marshs: marshListResponse [] ) =>
				{
					this._routes = {
						buses: [],
						smallBuses: [],
						trams: [],
						trolleys: []
					};
					for (var i = 0; i < marshs.length; i++)
					{
						switch (marshs[i].type) {
							case 0:
								this._routes.buses = marshs[i].ways;
							break;
							case 1:
								this._routes.trolleys = marshs[i].ways;
							break;
							case 2:
								this._routes.trams = marshs[i].ways;
							break;
							case 7:
								this._routes.smallBuses = marshs[i].ways;
							break;
						}
					}
					cb(this._routes);
				},
        err => console.log(err)
      )
      ;
		}
	}

	private _getRoutes (): Observable<marshListResponse []>
	{
		return this._http
			.get( this._echoUrl + this._listmarsh )
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