import {Component, OnInit, AfterViewChecked} from '@angular/core';

import {TransportService} from '../../services/transport-service';

@Component({
  templateUrl: 'build/pages/map/map.html'
})
export class MapPage implements OnInit, AfterViewChecked
{
  private _L: iL;
  private _map: iMap;
  private _trackMapSize: boolean;
  private _actualRouteLines: actualRoute;

  // constants
  private _stopRadius: number;
  // private _routeColors: string [];

  constructor(private _transportService: TransportService)
  {
    this._trackMapSize = true;
    this._actualRouteLines = {};

    this._stopRadius = 15;

    // this._routeColors = ['blue', 'green', 'red'];
  }

  public ngOnInit (): void
  {
    // map intialization
    this._L = window['L'];
    const southWest = this._L.latLng(30, 10),
          northEast = this._L.latLng(80, 200),
          bounds = this._L.latLngBounds(southWest, northEast);
    const startCoords = {lat: 54.908593335436926, lng: 83.0291748046875};
    const startZoom = 11;

    this._map = this._L.map('map', {
        minZoom: 4,
        maxBounds: bounds
    }).setView(startCoords, startZoom);
window['mm'] = this._map;
    this._L.tileLayer.provider('OpenStreetMap.HOT').addTo(this._map);

    document.querySelector('.leaflet-control-zoom').remove();
    document.querySelector('.leaflet-control-attribution').remove();

    // subscribe to searched routes updates
    this._transportService.subscribeForAddLineOnMap(
      this._newLineOnMapCb.bind(this)
    );
  }

  public ngAfterViewChecked (): void
  {
    // track when map container has been initialized
    if (this._map._container.offsetWidth !== 0 && this._trackMapSize)
    {
      // map ready
      this._trackMapSize = false;
      this._map.invalidateSize();
    }
  }

  // public openMenu (): void
  // {
  //   // location.hash = 'menu';
  // }

  private _newLineOnMapCb (id: string, trass: trassPoint [], instead: string): void
  {
    if (instead)
    {
      this._removeRouteOnMap(instead);
    }

    this._addRouteOnMap(id, trass);
  }

  /**
   * remove route polyline from the map and from memory
   */
  private _removeRouteOnMap (id: string): void
  {
    if (this._actualRouteLines[id])
    {
      this._actualRouteLines[id].stops
        .forEach( e => this._map.removeLayer(e.marker) );
      this._map.removeLayer(this._actualRouteLines[id].route);
    }
  }

  /**
   * create route polyline and display it on the map
   */
  private _addRouteOnMap (id: string, trass: trassPoint []): void
  {
    const stops = trass
      .filter( e => !!e.id )
      .map( e => _createStopMarker.bind(this)(e) )
      ;
    this._actualRouteLines[id] =
    {
      route: this._L.polyline(trass, {color: 'blue'}).addTo(this._map),
      stops
    };
    this._map.fitBounds(this._actualRouteLines[id].route.getBounds());

    // not pure !!!
    function _createStopMarker (e)
    {
      const marker = this._L
        .circle(e, this._stopRadius,
          {
            fill: true,
            // radius: this._stopRadius,
            fillOpacity: 1
          }
        )
        .bindPopup(e.n)
        .addTo(this._map)
        ;
      const out =
      {
        id: e.id,
        marker: marker
      };
      return out;
    }
  }



}
