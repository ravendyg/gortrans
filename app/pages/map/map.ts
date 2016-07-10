import {Component, OnInit, AfterViewChecked} from '@angular/core';
import { Observable } from 'rxjs/Observable';
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
  private _buses: {id: string, marker: any} [];
  private _swipeouts: any [];
  private _stopsHidden: boolean;

  // constants
  private _stopRadius: number;
  private _routeColors: string [];
  private _typeToNames: {[id: string]: string};
  private _icons: {[id: string]: iIcon};

  public busIcons: busIcon [];

  constructor(private _transportService: TransportService)
  {
    this._trackMapSize = true;
    this._actualRouteLines = {};

    this._stopRadius = 15;

    this._buses = [];

    this.busIcons = [];

    this._routeColors = ['blue', 'green', 'red'];

    this._swipeouts = [];

    this._typeToNames =
    {
      '1': 'bus',
      '2': 'trolley',
      '3': 'tram',
      '8': 'minibus'
    };

    this._icons = {};
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
    this._stopsHidden = true;

    this._map = this._L.map('map', {
        minZoom: 4,
        maxBounds: bounds
    }).setView(startCoords, startZoom);
window['mm'] = this._map;
    this._L.tileLayer.provider('OpenStreetMap.HOT').addTo(this._map);

    document.querySelector('.leaflet-control-zoom').remove();
    document.querySelector('.leaflet-control-attribution').remove();

    // track zoom change and hide stops on big scale
    this._map.on(
      'zoomend',
      ((e: Event) =>
      {
        var i: number;
        if (this._map.getZoom() >= 13)
        { // show
          if (this._stopsHidden)
          {
            this._changeCSSRule('.bus-stop-marker', " {}");
            this._stopsHidden = false;
          }
        }
        else
        { // hide
          if (!this._stopsHidden)
          {
            this._changeCSSRule('.bus-stop-marker', " { display: none !important; }");
            this._stopsHidden = true;
          }
        }
      }).bind(this)
    );

    // subscribe to searched routes updates
    this._transportService.subscribeForAddLineOnMap(
      this._newLineOnMapCb.bind(this)
    );

    this._transportService.subscribeForMarkers(
      this._processBusMarkers.bind(this)
    );

    // prepare icons
    this._icons['stop'] =  this._L.icon({
      iconUrl: `build/img/bus-stop.png`,
      iconSize: [46, 42],
      className: 'bus-stop-marker'
    });

    for (var keyType in this._typeToNames)
    {
      for (var angle = 0; angle < 360; angle += 45)
      {
        this._icons[`${keyType}-${angle}`] =
          this._L.icon({
            iconUrl: `build/img/transport/${this._typeToNames[keyType]}-${angle}.png`,
            iconSize: [46, 42],
          });
      }
    }

    // icon menu manipulation
    document.addEventListener('touchstart', this._initSwipeout.bind(this));
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

  public zoomToRoute (id: string)
  {
    this._map.fitBounds(
      this._actualRouteLines[id].route.getBounds()
    );
  }

  private _changeCSSRule (selector: string, newRule: string): void
  {
    const cssFiles = document.styleSheets;
    var keyCss, countCss;
    for (keyCss = 0; keyCss < cssFiles.length; keyCss++)
    {
      if (cssFiles[keyCss].href.match('app.md.css'))
      {
        const rules = (<CSSStyleSheet>cssFiles[keyCss]).cssRules
        for (countCss = 0; countCss < rules.length; countCss++)
        {
          if ((<CSSStyleRule>rules[countCss]).selectorText === selector)
          {
            (<CSSStyleSheet>cssFiles[keyCss]).deleteRule(countCss);
            (<CSSStyleSheet>cssFiles[keyCss]).insertRule(selector + newRule, 0);
            break;
          }
        }
        break;
      }
    }
  }

  private _initSwipeout(e: TouchEvent): void
  {
    var iconDiv = this._findDivParent(<HTMLElement>e.target);
    if (iconDiv && iconDiv.dataset['type'] === 'icon-div')
    {
      this._setSwipeout(e.touches[0], iconDiv);
    }
  }

  private _findDivParent (el: HTMLElement): HTMLDivElement
  {
    while (   el.tagName.toLowerCase() !== 'div'
           && el.tagName.toLowerCase() !== 'body')
    {
      el = el.parentElement;
    }
    if (el.tagName.toLowerCase() === 'body') { return null; }
    return <HTMLDivElement>el;
  }

  private _removeRoute (id: string)
  {
    this._removeRouteOnMap(id);
  }

  private _setSwipeout (e: Touch, target: HTMLDivElement)
  {
    const id = target.dataset['id']
    const start = Date.now();

    const move =
      Observable
        .interval(50)
        .takeUntil( Observable.fromEvent(document,'touchend') )
        ;

    const sub = move.subscribe(
      vl =>
      {
        target.style.transform =
          vl % 2 === 0 ? `rotate(10deg)` : `rotate(-10deg)`;
      },
      er => {},
      (() =>
      {
        if (Date.now() - start < 1000)
        {
          target.style.transform = `rotate(0deg)`;
          this.zoomToRoute(id);
        }
        if (Date.now() - start >= 1000)
        {
          target.remove();
          this._removeRoute(id)
        }
      }).bind(this)
    );
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
            var azimuth = Math.floor( (Math.abs(e.azimuth-22.5)) / 45 )*45;
            const icon =
              this._icons[`${key.split('-')[0]}-${azimuth}`]

            const marker = this._L
              .marker({lat: e.lat, lng: e.lng}, {icon})
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
      // remove route stops from the map
      this._actualRouteLines[id].stops
        .forEach( e => this._map.removeLayer(e.marker) );
      // remove route from the map
      this._map.removeLayer(this._actualRouteLines[id].route);
      // free color
      this._routeColors.push(this._actualRouteLines[id].color);
      // from route memory
      delete this._actualRouteLines[id];
      // remove icon
      this.busIcons = this.busIcons.filter( e => e.id !== id );
    }

    // remove buses from the map
    this._buses.forEach(
      e =>
      {
        if (e.id === id) { this._map.removeLayer(e.marker); }
      }
    );
    // remove buses from memory
    this._buses = this._buses.filter( e => e.id !== id );

    // remove from service
    this._transportService.removeLine(id);
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

    var [type, name] = id.split('-');
    name = name.replace(/^0*/, '');

    const img = `build/img/${this._typeToNames[type]}.png`;

    this.busIcons.push({
      id, color, img, name
    });

    // not pure !!!
    function _createStopMarker (e)
    {
      const marker = this._L
        .marker({lat: e.lat, lng: e.lng}, {icon: this._icons['stop']})
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
