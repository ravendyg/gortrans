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
	private _listMarsh: string;
	private _listTrasses: string;
	private _listMarkers: string;

	private _routes: routesType;

	private _lines: { [id: string]: trassPoint [] };

	constructor(private _http: Http)
	{
		this._echoUrl = 'http://excur.info:3006';
		this._listMarsh = '?url=http://maps.nskgortrans.ru/listmarsh.php?r&r=true';
		this._listTrasses = '?url=http://maps.nskgortrans.ru/trasses.php?r=';
		this._listMarkers = '?url=http://maps.nskgortrans.ru/markers.php?r=';
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

	public getRouteLine (marsh: string, type: number, cb: any): void
	{
		if (this._lines[ type + '-' + marsh])
		{	// already fetched
			cb( type + '-' + marsh, this._lines[ type + '-' + marsh]);
		}
		else
		{
			this._getRouteLine(type, marsh)
			.subscribe(
				((trass: trassPoint []) =>
				{
					this._lines[ type + '-' + marsh] = trass;
					cb( type + '-' + marsh, trass);
				}).bind(this),
				err => console.log(err)
			)
			;
		}
	}

	/** get buses coordinates
	 *	@ids - merged type + '-' + marsh
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
	 *	@ids - merged  type + '-' + marsh
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
			.get( this._echoUrl + this._listMarkers + query)
			.map(
				(resp: Response) =>
				{
					var parsedRes = <{markers: busDataResponse []}>resp.json();
					return parsedRes.markers.map(
						e => (
						{
							title: e.title,
							idTypetr: e.id_typetr,
							marsh: e.marsh,
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

	// get list of routes from gortrans
	private _getRoutes (): Observable<marshListResponse []>
	{
		return this._http
			.get( this._echoUrl + this._listMarsh )
			.map( (resp: Response) => <marshListResponse []>resp.json() )
			.catch( this._handleHttpError )
			;
	}

	/** get list of point for specified route
	 * @type
	 * @marsh - route
	 **/
	private _getRouteLine (type: number, marsh: string): Observable<trassPoint []>
	{
		return this._http
			.get( this._echoUrl + this._getTrassUrl(type, marsh) )
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

	private _getTrassUrl (type: number, marsh: string): string
	{
		return this._listTrasses + type + '-' + marsh + '-W';
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