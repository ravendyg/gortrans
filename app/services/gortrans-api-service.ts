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
			this._indexedDbService.getRoutes(
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
      ;
		}
	}

	public getRouteLine (
		route: string,
		type: number,
		cb: (id: string, route: trassPoint []) => any
	): void
	{
		const id = type + '-' + route;
		if (this._lines[id])
		{	// already fetched
			cb( id, this._lines[id]);
		}
		else
		{
			this._indexedDbService.getRouteLine(
				id,
				((trass: trassPoint []) =>
				{
					this._lines[id] = trass;
					cb( id, trass);
				}).bind(this)
			);
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

	private _getTrassUrl (type: number, route: string): string
	{
		return this._config.listTrasses + type + '-' + route + '-W';
	}

	private _handleHttpError (
		err: Response,
		caught: Observable<any>
	): Observable <any []>
	{
		console.log(err);
		return Observable.create(
			observer => observer.next([])
		);
		// return Observable.throw(err.json().error || 'Server error');
	}
}