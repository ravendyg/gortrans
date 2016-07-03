/// <reference path="../typings/ref.d.ts" />

import { Injectable, OnInit } from '@angular/core';
// import { Observable } from 'rxjs/Observable';

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

	constructor(private _gortransService: GortransApiService)
	{
    this._linesLimit = 1;
		this._routeLinesOnMap = [];

    this._addLineOnMapSubId = 1;
    this._addLineOnMapSubs = {};
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

}