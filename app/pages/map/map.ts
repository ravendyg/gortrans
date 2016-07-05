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
  private _buses: any [];

  // constants
  private _stopRadius: number;
  private _routeColors: string [];

  public busIcons: busIcon [];

  constructor(private _transportService: TransportService)
  {
    this._trackMapSize = true;
    this._actualRouteLines = {};

    this._stopRadius = 15;

    this._buses = [];

    this.busIcons = [];

    this._routeColors = ['blue', 'green', 'red'];
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

    this._transportService.subscribeForMarkers(
      this._processBusMarkers.bind(this)
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

  public removeRoute (id: string)
  {
    this._removeRouteOnMap(id);
  }

  private _processBusMarkers ( markers: {[id: string]: busData []} )
  {
    this._buses.map(
      ( e => this._map.removeLayer(e.marker) ).bind(this)
    );

    for (var key in markers)
    {
      if ( this._actualRouteLines[key] )
      { // haven't yet removed corresponding line
        markers[key].map(
          (e =>
          {
            const marker = this._L
              .marker({lat: e.lat, lng: e.lng})
              .bindPopup(e.title)
              .addTo(this._map)
              ;
            this._buses.push({
              id: key,
              marker
            });
          }).bind(this)
        );
      }
    }
  }

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
      // free color
      this._routeColors.push(this._actualRouteLines[id].color);
      // remove icon
      this.busIcons = this.busIcons.filter( e => e.id !== id );
    }
  }

  /**
   * create route polyline and display it on the map
   */
  private _addRouteOnMap (id: string, trass: trassPoint []): void
  {
    const color = this._routeColors.pop();

    const stops = trass
      .filter( e => !!e.id )
      .map( e => _createStopMarker.bind(this)(e) )
      ;
    this._actualRouteLines[id] =
    {
      route: this._L.polyline(
                trass,
                {
                  color,
                  className: 'route-line'
                }
              ).addTo(this._map),
      stops,
      color
    };
    this._map.fitBounds(this._actualRouteLines[id].route.getBounds());

    var img;
    var [type, name] = id.split('-');
    name = name.replace(/^0*/, '');
    switch (type)
    {
      case '1':
        img = 'build/img/bus.png';
      break;
      case '2':
        img = 'build/img/trolley.png';
      break;
      case '3':
        img = 'build/img/tram.png';
      break;
      case '8':
        img = 'build/img/minibus.png';
      break;
    }
    this.busIcons.push({
      id, color, img, name
    });

    // not pure !!!
    function _createStopMarker (e)
    {
      const marker = this._L
        .circle(e, this._stopRadius,
          {
            fill: true,
            fillOpacity: 1,
            className: 'bus-stop',
            color
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
