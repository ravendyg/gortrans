/// <reference path="../typings/ref.d.ts" />

import { Injectable, OnInit } from '@angular/core';
import { Http, Response } from '@angular/http';
import { Observable } from 'rxjs/Observable';

import {ConfigService} from './config-service';
import {IndexedDbService} from './indexeddb-service';

@Injectable()
export /**
 * GortransApiService
 */
class GortransApiService implements OnInit{

	private _routes: routesType;

	private _lines: { [id: string]: trassPoint [] };

	constructor(
		private _http: Http,
		private _indexedDbService: IndexedDbService,
		private _config: ConfigService
	)
	{
		this._lines = {};
	}

	public ngOnInit (): void
	{
	}

	public getRoutes (cb: any): void
	{
		if (this._routes)
		{
			cb(this._routes);
		}
		else
		{
			// this._getRoutes()
			this._indexedDbService.getRoutes()
			// .subscribe(
			.then(
        (routes: routesListResponse [] ) =>
				{
					this._routes = {
						buses: [],
						smallBuses: [],
						trams: [],
						trolleys: []
					};
					for (var i = 0; i < routes.length; i++)
					{
						switch (routes[i].type) {
							case 0:
								this._routes.buses = routes[i].ways;
							break;
							case 1:
								this._routes.trolleys = routes[i].ways;
							break;
							case 2:
								this._routes.trams = routes[i].ways;
							break;
							case 7:
								this._routes.smallBuses = routes[i].ways;
							break;
						}
					}
					cb(this._routes);
				}
      )
			.catch(
				err => console.log(err)
			)
      ;
		}
	}

	public getRouteLine (
		route: string,
		type: number,
		cb: (id: string, route: trassPoint []) => any
	): void
	{
		if (this._lines[ type + '-' + route])
		{	// already fetched
			cb( type + '-' + route, this._lines[ type + '-' + route]);
		}
		else
		{
			this._getRouteLine(type, route)
			.subscribe(
				((trass: trassPoint []) =>
				{
					this._lines[ type + '-' + route] = trass;
					cb( type + '-' + route, trass);
				}).bind(this),
				err => console.log(err)
			)
			;
		}
	}

	/** get buses coordinates
	 *	@ids - merged type + '-' + route
	**/
	public getMarkers(ids: string [], cb: any): void
	{
		this._getMarkers(ids)
			.subscribe(
				cb,
				console.log
			);
	}

	/** get buses coordinates
	 *	@ids - merged  type + '-' + route
	**/
	private _getMarkers(ids: string []): Observable<busData []>
	{
		const query: string = ids.reduce(
			(acc, cv) =>
			{	const parts = cv.split('-');
				return acc + parseInt(parts[0]) + '-' + parts[1] + '-W-' + parts[1] + '|';
			},
			''
		);
		return this._http
			.get( this._config.rootUrl + this._config.listMarkers + query)
			.map(
				(resp: Response) =>
				{
					var parsedRes = <{markers: busDataResponse []}>resp.json();
					return parsedRes.markers.map(
						e => (
						{
							title: e.title,
							idTypetr: e.id_typetr,
							route: e.marsh,
							graph: +e.graph,
							direction: e.direction,
							lat: +e.lat,
							lng: +e.lng,
							time_nav: Date.parse(e.time_nav),
							azimuth: +e.azimuth,
							rasp: e.rasp,
							speed: +e.speed,
							segmentOrder: e.segment_order,
							ramp: e.ramp
						})
					);
				}
			)
			.catch( this._handleHttpError )
			;
	}

	// // get list of routes from gortrans
	// private _getRoutes (): Observable<routesListResponse []>
	// {
	// 	return this._http
	// 		.get( this._config.rootUrl + this._config.listRoutes )
	// 		.map( (resp: Response) => <routesListResponse []>resp.json() )
	// 		.catch( this._handleHttpError )
	// 		;
	// }

	/** get list of point for specified route
	 * @type
	 * @route
	 **/
	private _getRouteLine (type: number, route: string): Observable<trassPoint []>
	{
		return this._http
			.get( this._config.rootUrl + this._getTrassUrl(type, route) )
			.map(
				(resp: Response) =>
				{
					const parsedRes = <trassPointsResponse>resp.json();
					return parsedRes.trasses[0].r[0].u
						.map(
							e =>
							{
								e.lat = +e.lat;
								e.lng = +e.lng;
								return e;
							}
						);
				}
			)
			.catch( this._handleHttpError )
			;
	}

	private _getTrassUrl (type: number, route: string): string
	{
		return this._config.listTrasses + type + '-' + route + '-W';
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