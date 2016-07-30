/// <reference path="../typings/ref.d.ts" />

import { Injectable, OnInit } from '@angular/core';
import { Observable } from 'rxjs/Observable';

import {ConfigService} from './config-service';
import {GortransInfoApiService} from './gortrans-info-api-service';


var _syncTimestamp: number;
var GortransInfo: GortransInfoApiService;
var _sync: Promise<any>;

var _routes: routesListResponse [] = [];

var routesUpdateNeeded = false;


/** indexedDb */
var DB: IDBDatabase = null;
const dbName = "gortrans";
const routesStoreName = "routes";
const routePointsStoreName = "routePoints";
const stopsStoreName = "busStops";

var request = indexedDB.open(dbName, 6);


request.addEventListener(
	'upgradeneeded',
	ev =>
	{
		DB = (<IDBOpenDBRequest>ev.target).result;

		while (DB.objectStoreNames.length > 0)
		{
			DB.deleteObjectStore( DB.objectStoreNames[0] );
		}

		DB.createObjectStore(routesStoreName);
		DB.createObjectStore(routePointsStoreName);
		DB.createObjectStore(stopsStoreName);

		localStorage.setItem('routesTimestamp', '0');
	}
);

request.addEventListener(
	'success',
	ev =>
	{
		DB = (<IDBOpenDBRequest>ev.target).result;
	}
);

@Injectable()
export /**
 * IndexedDbService
 */
class IndexedDbService {

	constructor(
		private _gortransInfo: GortransInfoApiService,
		private _config: ConfigService
	)
	{
		GortransInfo = this._gortransInfo;

		_syncTimestamp = localStorage.getItem('routesTimestamp') || 0;

		_sync = _syncronize(this._config);

	}

	public getRoutes (cb: (routes: routesListResponse []) => void): void
	{	// load whatever is in the DB
		loadRoutesFromDB()
		.then(
			(routes: routesListResponse []) =>
			{
				cb(routes);
			},
			err =>
			{
				console.error(err);
				cb([]);
			}
		);

		// wait for _sync
		_sync.
		then(
			() =>
			{
				if (routesUpdateNeeded)
				{	// something changed, exec callback again to refresh onthe user's side
					loadRoutesFromDB()
					.then(
						(routes: routesListResponse []) =>
						{
							cb(routes);
						},
						err => { console.error(err); }
					);
				}
			}
		);
	}

	public getRouteLine (id: string, cb: (line: trassPoint []) => void): void
	{	// load whatever is in the DB
		loadRouteLineFromDB(id)
		.then(
			(line: trassPoint []) =>
			{
				cb(line);
			},
			err =>
			{
				console.error(err);
				cb([]);
			}
		);

		// wait for _sync
		_sync.
		then(
			() =>
			{
				if (routesUpdateNeeded)
				{	// something changed, exec callback again to refresh on the user's side
					loadRouteLineFromDB(id)
					.then(
						(line: trassPoint []) =>
						{
							cb(line);
						},
						err => { console.error(err); }
					);
				}
			}
		);
	}
}

function loadRoutesFromDB (): Promise<routesListResponse []>
{
	function main (resolve, reject)
	{
		const transaction = DB.transaction([routesStoreName], "readwrite");
		const store = transaction.objectStore(routesStoreName);
		const request = store.get('all');
		request.addEventListener(
			'success',
			() => resolve( request.result || [] )
		);
		request.addEventListener(
			'error',
			() => resolve( [] )
		);
	}
	return new Promise( main );
}

function loadRouteLineFromDB (id: string): Promise<trassPoint []>
{
	function main (resolve, reject)
	{
		const transaction = DB.transaction([routePointsStoreName], "readwrite");
		const store = transaction.objectStore(routePointsStoreName);
		const request = store.get(id);
		request.addEventListener(
			'success',
			() => resolve( request.result.u )
		);
	}
	return new Promise( main );
}

/**
 * send a time of last syncronization to nskgortrans.info
 *
 * @resolve
 */
function _syncronize (config: ConfigService): Promise<any>
{
	function main (resolve, reject)
	{
		var interval = -1;
		if ( _checkConnection() )
		{
			performSync();
		}
		else
		{
			interval =
				setInterval(
					() =>
					{
						if ( _checkConnection() )
						{
							clearInterval(interval);
							performSync();
						}
					},
					2000
				);
		}
		function performSync ()
		{
			GortransInfo.synchronize(_syncTimestamp)
				.subscribe(
					dat =>
					{
						const call1 = _updateRoutes(dat.routesFlag, dat.routes);
						const call2 = _updateRouteLines(dat.trassFlag, dat.trasses);
						const call3 = _updateBusStops(dat.trassFlag, dat.stops);
						Observable.zip(call1, call2)
							.subscribe(
								res =>
								{
									localStorage.setItem('routesTimestamp', ''+getTimestamp());
									resolve();
								},
								err =>
								{
									console.log(err);
									// hope that there is data in DB
									resolve();
								}
							);

						if (dat.use)
						{
							config.changeRoot(dat.use);
						}
					},
					err =>
					{
						console.log('sync error', (err));
						// hope that there is data in DB
						resolve();
					}
				);
		}
	}
	return new Promise( main );
}

function _updateRoutes (flag, routes): Observable<void>
{
	return Observable.create(
		observer =>
		{
			if (flag)
			{
				observer.next(true);
			}
			else
			{
				routesUpdateNeeded = true;

				const transaction = DB.transaction([routesStoreName], "readwrite");
				const store = transaction.objectStore(routesStoreName);
				putIntoDb(store, routes, 'all')
				.then(
					flag => observer.next(true)
				)
				.catch(
					flag => observer.next(true)
				);
			}
		}
	);
}

function _updateRouteLines (flag, routeLines): Observable<void>
{
	return Observable.create(
		observer =>
		{
			if (flag)
			{
				observer.next(true);
			}
			else
			{
				const transaction = DB.transaction([routePointsStoreName], "readwrite");
				const store = transaction.objectStore(routePointsStoreName);

				var promises = [];
				for (var k = 0; k < routeLines.length; k++)
				{
					promises.push(
						putIntoDb(store, routeLines[k].line, routeLines[k].id)
					);
				}
				if (promises.length === 0) { observer.next(true); }
				else {
					Promise.all(promises)
					.then(
						resp =>
						{
							observer.next(true);
						}
					)
					.catch(
						err => {
							console.error(err);
							observer.next(true);
						}
					)
					;
				}
			}
		}
	);
}

function _updateBusStops (flag, busStops): Observable<void>
{
	return Observable.create(
		observer =>
		{
			if (flag)
			{
				observer.next(true);
			}
			else
			{
				const transaction = DB.transaction([stopsStoreName], "readwrite");
				const store = transaction.objectStore(stopsStoreName);
				putIntoDb(store, busStops, 'all')
				.then(
					flag => observer.next(true)
				)
				.catch(
					flag => observer.next(true)
				);
			}
		}
	);
}

function putIntoDb (store, data, key)
{
	function main (resolve, reject)
	{
		const request = store.put(data, key);
		request.addEventListener(
			'success',
			() => resolve(true)
		);
		request.addEventListener(
			// hope that there is data in DB
			'error',
			() => reject(true)
		);
	}
	return new Promise( main );
}

/**
 * return UNIX timestamp
 */
function getTimestamp ()
{
	return Math.round( Date.now() / 1000 );/// 60 / 60 / 24);
}

function _checkConnection ()
{
	if (
				( navigator['network'].connection.type.toLowerCase().match('no network')  ||
					navigator['network'].connection.type === 'none' )
			)
	{
		return false
	}
	else
	{
		return true;
	}
}