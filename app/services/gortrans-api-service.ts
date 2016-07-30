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
		this._indexedDbService.getRoutes(
			(routes: routesListResponse [] ) =>
			{
				var _routes = {
					buses: [],
					smallBuses: [],
					trams: [],
					trolleys: []
				};
				// transform raw .ru response into more convenient form of routesType
				for (var i = 0; i < routes.length; i++)
				{
					switch (routes[i].type) {
						case 0:
							_routes.buses = routes[i].ways;
						break;
						case 1:
							_routes.trolleys = routes[i].ways;
						break;
						case 2:
							_routes.trams = routes[i].ways;
						break;
						case 7:
							_routes.smallBuses = routes[i].ways;
						break;
					}
				}
				cb(_routes);
			}
		)
		;
	}

	public getRouteLine (
		route: string,
		type: number,
		name: string,
		cb: (id: string, name: string, route: trassPoint [], oldState?: boolean) => any,
		oldState?: boolean
	): void
	{
		const id = type + '-' + route;
		if (this._lines[id])
		{	// already fetched
			cb( id, name, this._lines[id]);
		}
		else
		{
			this._indexedDbService.getRouteLine(
				id,
				((trass: trassPoint []) =>
				{
					this._lines[id] = trass;
					cb( id, name, trass, oldState);
				}).bind(this)
			);
		}
	}

	/** get buses coordinates
	 *	@ids - merged type + '-' + route
	**/
	public getMarkers(ids: string [], cb: any): void
	{
		if (
			!(navigator['network'].connection.type.toLowerCase().match('no network')  ||
        navigator['network'].connection.type === 'none' )
			)
		{
			this._getMarkers(ids)
				.subscribe(
					cb,
					console.log
				);
		}
	}

	/** get list of busses that are expected on the selected stops */
	public getStopInfos
	(
		stopIds: string []
	): Promise<{ stopId: string, forecasts: Forecast []} []>
	{
		return new Promise(
			resolve =>
			{
				Promise.all(
					stopIds.map(
						e => this._getStopInfo(e)
					)
				)
				.then(
					(stopInfos: any) =>
					{
						resolve( stopInfos.filter(e => e.stopId) );
					}
				)
				.catch(
					err =>
					{
						console.error(err);
						resolve([]);
					}
				)
				;
			}
		);
	}

	private _getStopInfo (stopId: string): Promise<any>
	{
		return new Promise(
			resolve =>
			{
				if (
					( navigator['network'].connection.type.toLowerCase().match('no network')  ||
            navigator['network'].connection.type === 'none' )
					)
				{
					console.log('no connection');
					resolve( {} );
				}
				else
				{
					this._http
						.get( this._config.rootUrl + this._config.forecast + stopId)
						.map(
							(resp: Response) => <Forecast []>(resp.json().routes)
						)
						.catch( this._handleHttpError )
						.subscribe(
							forecasts =>
							{
								resolve( {stopId, forecasts} );
							},
							err =>
							{
								console.error(err);
								resolve( {} );
							}
						);
						;
				}
			}
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