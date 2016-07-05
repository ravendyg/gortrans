/// <reference path="../typings/ref.d.ts" />

import { Injectable, OnInit } from '@angular/core';
import { Observable } from 'rxjs/Observable';

import {GortransApiService} from './gortrans-api-service';

@Injectable()
export /**
 * TransportService
 */
class TransportService implements OnInit {

  private _linesLimit: number;
	private _routeLinesOnMap: { id: string, trass: any } [];

  private _addLineOnMapSubId: number;
  private _addLineOnMapSubs: any;

  private _busWatcherId: number;

  private _markerSubsCounter: number;
  private _markerSubs: any;

	constructor(private _gortransService: GortransApiService)
	{
    this._linesLimit = 3;
		this._routeLinesOnMap = [];

    this._addLineOnMapSubId = 1;
    this._addLineOnMapSubs = {};

    this._markerSubsCounter = 0;
    this._markerSubs = {};

    this._busWatcherId = -1;
	}

	public ngOnInit (): void
	{
	}

  public selectRoute (marsh: string, type: number): void
  {
    this._gortransService.getRouteLine(marsh, type, this._getRouteLinesCallback.bind(this) )
  }

  private _getRouteLinesCallback (id: string, trass: trassPoint []): void
  {
    var instead: string = null;
    // check whether it's realy new line
    var lineIsNew: boolean =
      this._routeLinesOnMap.reduce(
        (acc, e) => e.id === id ? false : true,
        true
      );
    // check whether there is space for a new line, if not - FIFO
    if (lineIsNew && this._routeLinesOnMap.length < this._linesLimit)
    {
      this._routeLinesOnMap = this._routeLinesOnMap
        .concat( { id, trass } )
        ;
    }
    else if (lineIsNew)
    {
      instead = this._routeLinesOnMap[0].id;
      this._routeLinesOnMap = this._routeLinesOnMap
        .slice(1)
        .concat( { id, trass } )
        ;
    }

    // call subscribers
    if (lineIsNew)
    {
      this._runLinesOnMapChangeSubs(id, trass, instead);
      this._startWatchingBuses();
    }
  }

  public getLines (): { id: string, trass: trassPoint [] } []
  {
    return this._routeLinesOnMap;
  }

  /**
   * @cb - subscribtion callback
   * @return - unsubscribe callback
   */
  public subscribeForAddLineOnMap (cb: any): any
  {
    this._addLineOnMapSubs[this._addLineOnMapSubId++] = cb;
    return () => delete this._addLineOnMapSubs[this._addLineOnMapSubId - 1];
  }

  public subscribeForMarkers (cb: any)
  {
    this._markerSubs[this._markerSubsCounter++] = cb;
    return () => delete this._markerSubs[this._markerSubsCounter - 1];
  }

  /**
   * call subscribed callbacks
   * @id - new line id
   * @trass - new line points
   * @instead - id of the line that was replaced (null if non)
   */
  private _runLinesOnMapChangeSubs (id: string, trass: trassPoint [], instead: string): void
  {
    for (var key in this._addLineOnMapSubs)
    {
      this._addLineOnMapSubs[key](id, trass, instead);
    }
  }

  private _getMarkers ()
  {
    if (this._routeLinesOnMap.length === 0) { return; }

    const routes = this._routeLinesOnMap.map( e => e.id );

    this._gortransService.getMarkers(routes,
      ((buses: busData []) =>
      {
        // if (buses.length === 0) { return; }
        // (type + 1) + '-' + marsh
        const separatedBuses = buses.reduce(
          (pv, cv) =>
          {
            pv[cv.idTypetr + '-' + cv.marsh] = pv[cv.idTypetr + '-' + cv.marsh] || [];
            pv[cv.idTypetr + '-' + cv.marsh].push(cv);
            return pv;
          },
          {}
        );

        for (var key in this._markerSubs)
        {
          this._markerSubs[key](separatedBuses);
        }
      }).bind(this)
    );
  }

  private _startWatchingBuses ()
  {
    this._stopWatchingBuses();

    this._getMarkers();

    this._busWatcherId = setInterval(
      this._getMarkers.bind(this),
      1000 * 40 // every 40 sec
    )
  }

  private _stopWatchingBuses ()
  {
    clearInterval(this._busWatcherId);
  }

}