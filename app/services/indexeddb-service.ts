/// <reference path="../typings/ref.d.ts" />

import { Injectable, OnInit } from '@angular/core';
import { Observable } from 'rxjs/Observable';

import {ConfigService} from './config-service';
import {GortransInfoApiService} from './gortrans-info-api-service';


var _syncTimestamp: number;
var GortransInfo: GortransInfoApiService;
var _sync: Promise<any>;

var _routes: routesListResponse [] = [];


/** indexedDb */
var DB: IDBDatabase = null;
const dbName = "gortrans";
const routesStoreName = "routes";
const routePointsStoreName = "routePoints";

var request = indexedDB.open(dbName, 5);


request.addEventListener(
	'upgradeneeded',
	ev =>
	{
		DB = (<IDBOpenDBRequest>ev.target).result;

		DB.deleteObjectStore(routesStoreName);
		DB.deleteObjectStore(routePointsStoreName);

		DB.createObjectStore(routesStoreName);
		DB.createObjectStore(routePointsStoreName);
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

	public getRoutes (): Promise<routesListResponse []>
	{
		function main (resolve, reject)
		{
			_sync.
			then(
				() =>
				{
					const transaction = DB.transaction([routesStoreName], "readwrite");
					const store = transaction.objectStore(routesStoreName);
					const request = store.get('all');
					request.addEventListener(
						'success',
						() => resolve( request.result )
					);
				}
			)
			.catch( err => reject(err) )
			;
		}
		return new Promise( main );
	}

	public getRouteLine (id): Promise<trassPoint []>
	{
		function main (resolve, reject)
		{
			_sync.
			then(
				() =>
				{
					const transaction = DB.transaction([routePointsStoreName], "readwrite");
					const store = transaction.objectStore(routePointsStoreName);
					const request = store.get(id);
					request.addEventListener(
						'success',
						() => resolve( request.result.u )
					);
				}
			)
			.catch( err => reject(err) )
			;
		}
		return new Promise( main );
	}
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
		GortransInfo.synchronize(_syncTimestamp)
			.subscribe(
				dat =>
				{
					const call1 = _updateRoutes(dat.routesFlag, dat.routes);
					const call2 = _updateRouteLines(dat.trassFlag, dat.trasses);
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