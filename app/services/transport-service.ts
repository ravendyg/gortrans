/// <reference path="../typings/ref.d.ts" />

import { Injectable, OnInit } from '@angular/core';
import { Observable } from 'rxjs/Observable';

import {GortransApiService} from './gortrans-api-service';

var timeToBusesRefreshLeft: number;

var nextUpdateTimeSubs: any = {};
var nextUpdateTimeSubId = 1;

var stopInfoInterval = -1;
var stopInfos: StopInfo [] = [];
var stopSubs: { [id: string]: {stopId: string, cb: any, cbTime: any} } = {};
var stopSubId = 0;

var timeToStopsRefresh = 40;
var stopsRefreshed = false;

@Injectable()
export /**
 * TransportService
 */
class TransportService implements OnInit {

  private _linesLimit: number;
	private _routeLinesOnMap: { id: string, name: string, trass: any } [];

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

  public selectRoute
  (
    type: number,
    route: string,
    name: string,
    oldState?: boolean
  ): void
  {
    this._gortransService.getRouteLine(
      route,
      type,
      name,
      this._getRouteLinesCallback.bind(this),
      oldState
    );
  }

  private _getRouteLinesCallback
  (
    id: string,
    name: string,
    trass: trassPoint [],
    oldState?: boolean
  ): void
  {
    var instead: string = null;
    // check whether it's realy new line
    var lineIsNew: boolean =
      this._routeLinesOnMap.reduce(
        (acc, e) => e.id !== id,
        true
      );
    // check whether there is space for a new line, if not - FIFO
    if ( lineIsNew && this._routeLinesOnMap.length < this._linesLimit )
    {
      this._routeLinesOnMap = this._routeLinesOnMap
        .concat( { id, name, trass } )
        ;
    }
    else if (lineIsNew)
    {
      instead = this._routeLinesOnMap[0].id;
      this._routeLinesOnMap =
        this._routeLinesOnMap
          .slice(1)
          .concat( { id, name, trass } )
          ;
    }

    // call subscribers
    if (lineIsNew)
    {
      this._runLinesOnMapChangeSubs(id, name, trass, instead, oldState);
      this._startWatchingBuses();
    }
  }

  public getLines (): { id: string, trass: trassPoint [] } []
  {
    return this._routeLinesOnMap;
  }

  public removeLine (id: string): void
  {
    this._routeLinesOnMap = this._routeLinesOnMap.filter( e => e.id !== id );
    if ( this._routeLinesOnMap.length < 1 )
    { // nothing to watch for
      clearInterval( this._busWatcherId );
      this.setNextUpdateTime('');
    }
  }

  /**
   * @cb - subscribtion callback
   * @return - unsubscribe callback
   */
  public subscribeForAddLineOnMap
  (
    cb: any
  ): any
  {
    this._addLineOnMapSubs[this._addLineOnMapSubId++] = cb;
    return () => delete this._addLineOnMapSubs[this._addLineOnMapSubId - 1];
  }

  public subscribeForMarkers (cb: any)
  {
    this._markerSubs[this._markerSubsCounter++] = cb;
    return () => delete this._markerSubs[this._markerSubsCounter - 1];
  }

  public subscribeForNextUpdateTimeChange
  (
    cb: any
  ): () => void
  {
    nextUpdateTimeSubs[''+nextUpdateTimeSubId] = cb;
    nextUpdateTimeSubId++;
    return () => { delete nextUpdateTimeSubs[''+(nextUpdateTimeSubId-1)]; }
  }

  /** change message to be passed to map view about time left until the next update */
  public setNextUpdateTime
  (
    message: string
  )
  {
    for (var key in nextUpdateTimeSubs)
    {
      nextUpdateTimeSubs[key](message);
    }
  }

  public refreshPositions (): void
  {
    this._startWatchingBuses();
  }

  public subscribeToStops
  (
    stopId: string,
    _cb: (forecast: Forecast []) => void,
    _cbTime: (time: string) => void
  ): () => any
  {
    stopSubs[''+(stopSubId++)] =
    {
      stopId,
      cb: () =>
      {
        var stopInfo = stopInfos.find( e => e.stopId === stopId);
        if ( stopInfo )
        {
          _cb(stopInfo.forecasts);
        }
      },
      cbTime: (message) =>
      {
        _cbTime(message);
      }
    };

    if ( Object.keys(stopSubs).length === 1 )
      {
        this._startWatchingStops();
      }

    return () =>
    {
      delete stopSubs[''+(stopSubId-1)];
      if ( Object.keys(stopSubs).length === 0 )
      {
        this._stopWatchingStops();
      }
    }
  }

  /**
   * call subscribed callbacks
   * @id - new line id
   * @trass - new line points
   * @instead - id of the line that was replaced (null if non)
   */
  private _runLinesOnMapChangeSubs
  (
    id: string,
    name: string,
    trass: trassPoint [],
    instead: string,
    oldState?: boolean
  ): void
  {
    for (var key in this._addLineOnMapSubs)
    {
      this._addLineOnMapSubs[key](id, name, trass, instead, oldState);
    }
  }

  private _getMarkers (): Promise<any>
  {
    return new Promise(
      (resolve, reject) =>
      {
        if (this._routeLinesOnMap.length === 0)
        {
          reject();
          return;
        }


        this.setNextUpdateTime('Обновляю ...');

        const routes = this._routeLinesOnMap.map( e => e.id );

        this._gortransService.getMarkers(routes,
          ((buses: busData []) =>
          {
            const filteredBuses =
              buses.filter(
                (e, i, arr) =>
                {
                  if (i === 0) { return true; }
                  if (
                    e.title === arr[i-1].title &&
                    e.route === arr[i-1].route &&
                    e.graph === arr[i-1].graph
                  )
                  {
                    return false;
                  }
                  return true;
                }
              );
            const separatedBuses =
              filteredBuses.reduce(
                (pv, cv) =>
                {
                  pv[cv.idTypetr + '-' + cv.route] = pv[cv.idTypetr + '-' + cv.route] || [];
                  pv[cv.idTypetr + '-' + cv.route].push(cv);
                  return pv;
                },
                {}
              );

            for (var key in this._markerSubs)
            {
              this._markerSubs[key](separatedBuses);
            }

            resolve(true);

          }).bind(this)
        );
      }
    );
  }

  private _startWatchingBuses ()
  {
    this._stopWatchingBuses();

    // request updated data
    timeToBusesRefreshLeft = 40;
    var refreshed = false;

    this._getMarkers()
    .then(
      () =>
      {
        refreshed = true;
      }
    );

    this._busWatcherId =
      setInterval(
        () =>
        {
          timeToBusesRefreshLeft--;

          if (refreshed)
          { // while refreshing show "обновляю"
            // when done, show time left
            this.setNextUpdateTime(''+timeToBusesRefreshLeft);
          }

          if (timeToBusesRefreshLeft === 0)
          { // time to refresh
            timeToBusesRefreshLeft = 40;
            refreshed = false;

            this._getMarkers()
            .then(
              () =>
              {
                refreshed = true;
              }
            );
          }
        },
        1000 // every 1 sec
      );
  }

  private _stopWatchingBuses ()
  {
    this.setNextUpdateTime('');
    clearInterval(this._busWatcherId);
  }

  private _startWatchingStops ()
  {
    this._getStopInfos();

    timeToStopsRefresh = 40;
    for (var key in stopSubs)
    {
      stopSubs[key].cbTime(''+timeToStopsRefresh);
    }

    stopInfoInterval =
      setInterval(
        () =>
        {
          timeToStopsRefresh--;
          if (timeToStopsRefresh < 0)
          {
            if (stopsRefreshed)
            {
              timeToStopsRefresh = 40;
              this._sendStopsTimeLeftMsg(''+timeToStopsRefresh);
            }
          }
          else if (timeToStopsRefresh === 0)
          {
            this._sendStopsTimeLeftMsg('Обновляю ...');
            this._getStopInfos();
          }
          else
          {
            this._sendStopsTimeLeftMsg(''+timeToStopsRefresh);
          }
        },
        1000
      );
  }

  private _stopWatchingStops ()
  {
    clearInterval(stopInfoInterval);
  }

  private _getStopInfos ()
  {
    var targetedStops =
      Object.keys(stopSubs)
      .map( e => stopSubs[e].stopId )
      ;

    this._gortransService.getStopInfos(targetedStops)
    .then(
      ( stopInfosResp: { stopId: string, forecasts: Forecast []} [] ) =>
      {
        stopInfos = stopInfosResp;
        for (var key in stopSubs)
        {
          stopSubs[key].cb();
        }
        stopsRefreshed = true;
      }
    )
  }

  private _sendStopsTimeLeftMsg (msg: string)
  {
    for (var key in stopSubs)
    {
      stopSubs[key].cbTime(msg);
    }
  }

}