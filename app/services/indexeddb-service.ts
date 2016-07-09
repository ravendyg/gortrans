/// <reference path="../typings/ref.d.ts" />

import { Injectable, OnInit } from '@angular/core';
import { Observable } from 'rxjs/Observable';

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

	constructor(private _gortransInfo: GortransInfoApiService)
	{
		GortransInfo = this._gortransInfo;

		_syncTimestamp = localStorage.getItem('routesTimestamp') || 0;

		_sync = _syncronize();
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
}

/**
 * send a time of last syncronization to nskgortrans.info
 *
 * @resolve
 */
function _syncronize (): Promise<any>
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
							err => reject(err)
						);
				},
				err => reject(err)
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
				const request = store.put(routes, 'all');
				request.addEventListener(
					'success',
					() => observer.next(true)
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
			{	//**********PLUG
				// here need to store it into db and then resolve
				observer.next(true);
			}
		}
	);
}

/**
 * return UNIX timestamp in days
 */
function getTimestamp ()
{
	return Math.round( Date.now() / 1000 / 60 / 60 / 24);
}