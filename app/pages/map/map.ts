import {Component, OnInit, AfterViewChecked} from '@angular/core';

import {TransportService} from '../../services/transport-service';

@Component({
  templateUrl: 'build/pages/map/map.html'
})
export class MapPage implements OnInit, AfterViewChecked
{
  private _L: any;
  private _map: any;

  private _trackMapSize: boolean;

  private _actualRouteLines: { [id: string]: any };

  constructor(private _transportService: TransportService)
  {
    this._trackMapSize = true;
    this._actualRouteLines = {};
  }

  public ngOnInit (): void
  {
    // map intialization
    this._L = window['L'];
    const southWest = this._L.latLng(30, 10),
          northEast = this._L.latLng(80, 200),
          bounds = this._L.latLngBounds(southWest, northEast);
    const startCoords = [54.908593335436926, 83.0291748046875];
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
    console.log('remove: ' + id);
  }

  /**
   * create route polyline and display it on the map
   */
  private _addRouteOnMap (id: string, trass: trassPoint []): void
  {
    // var polyline = this._L.polyline(latlngs, {color: 'red'}).addTo(map);
    console.log('add: ' + id);
    console.log(trass);
  }

}
