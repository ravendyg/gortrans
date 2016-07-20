import {Component, OnInit, AfterViewChecked, ChangeDetectorRef} from '@angular/core';
import { Observable } from 'rxjs/Observable';
import {TransportService} from '../../services/transport-service';

var _L: iL;
var _map: iMap;

var _buses: {id: string, marker: any} [];
var _icons: {[id: string]: iIcon};

@Component({
  templateUrl: 'build/pages/map/map.html'
})
export class MapPage implements OnInit, AfterViewChecked
{

  private _trackMapSize: boolean;
  private _actualRouteLines: actualRoute;
  private
  private _swipeouts: any [];
  private _stopsHidden: boolean;

  // constants
  private _stopRadius: number;
  private _routeColors: string [];
  private _typeToNames: {[id: string]: string};

  public busIcons: busIcon [];

  constructor(private _transportService: TransportService, private _ref: ChangeDetectorRef)
  {
    this._trackMapSize = true;
    this._actualRouteLines = {};

    this._stopRadius = 15;

    _buses = [];

    this.busIcons = [];
window['we'] = this;
    this._routeColors = ['blue', 'green', 'red'];

    this._swipeouts = [];

    this._typeToNames =
    {
      '1': 'bus',
      '2': 'trolley',
      '3': 'tram',
      '8': 'minibus'
    };

    _icons = {};
  }

  public ngOnInit (): void
  {
    // map intialization
    _L = window['L'];
    const southWest = _L.latLng(30, 10),
          northEast = _L.latLng(80, 200),
          bounds = _L.latLngBounds(southWest, northEast);
    const startCoords = {lat: 54.908593335436926, lng: 83.0291748046875};
    const startZoom = 11;
    this._stopsHidden = true;

    _map = _L.map('map', {
        minZoom: 4,
        maxBounds: bounds
    }).setView(startCoords, startZoom);
window['mm'] = _map;
    _L.tileLayer.provider('OpenStreetMap.HOT').addTo(_map);

    document.querySelector('.leaflet-control-zoom').remove();
    document.querySelector('.leaflet-control-attribution').remove();

    // track zoom change and hide stops on big scale
    _map.on(
      'zoomend',
      ((e: Event) =>
      {
        var i: number;
        if (_map.getZoom() >= 13)
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
    _icons['stop'] =  _L.icon({
      iconUrl: `build/img/bus-stop.png`,
      iconSize: [46, 42],
      className: 'bus-stop-marker'
    });

    for (var keyType in this._typeToNames)
    {
      for (var angle = 0; angle < 360; angle += 45)
      {
        _icons[`${keyType}-${angle}`] =
          _L.icon({
            iconUrl: `build/img/transport/${this._typeToNames[keyType]}-${angle}.png`,
            iconSize: [46, 42],
            // iconAnchor: [10,10],
            // labelAnchor: [2,0]
          });
      }
    }

    // icon menu manipulation
    document.addEventListener('touchstart', this._initSwipeout.bind(this));
  }

  public ngAfterViewChecked (): void
  {
    // track when map container has been initialized
    if (_map._container.offsetWidth !== 0 && this._trackMapSize)
    {
      // map ready
      this._trackMapSize = false;
      _map.invalidateSize();
    }
  }

  public zoomToRoute (id: string)
  {
    _map.fitBounds(
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
    _buses.map(
      ( e => _map.removeLayer(e.marker) ).bind(this)
    );

    for (var key in markers)
    {
      if ( this._actualRouteLines[key] )
      { // haven't yet removed corresponding line
        markers[key].map(
          e =>
          {
            var azimuth = Math.floor( (Math.abs(e.azimuth+22.5)) / 45 )*45 % 360;
            const icon = _icons[`${key.split('-')[0]}-${azimuth}`]

            const marker = _L
              .marker({lat: e.lat, lng: e.lng}, {icon})
              .bindLabel(e.title, { noHide: true })
              // .addTo(_map)
              .hideLabel()
              ;
// window['mr'] = marker;
            marker.addTo(_map);
            setTimeout(
              () => { marker.showLabel(); },
              100
            );

            _buses.push({
              id: key,
              marker
            });

          }
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
        .forEach( e => _map.removeLayer(e.marker) );
      // remove route from the map
      _map.removeLayer(this._actualRouteLines[id].route);
      // free color
      this._routeColors.push(this._actualRouteLines[id].color);
      // from route memory
      delete this._actualRouteLines[id];
      // remove icon
      this.busIcons = this.busIcons.filter( e => e.id !== id );
    }

    // remove buses from the map
    _buses.forEach(
      e =>
      {
        if (e.id === id) { _map.removeLayer(e.marker); }
      }
    );
    // remove buses from memory
    _buses = _buses.filter( e => e.id !== id );

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
      route: _L.polyline(
                trass,
                {
                  color,
                  className: 'route-line'
                }
              ).addTo(_map),
      stops,
      color
    };
    _map.fitBounds(this._actualRouteLines[id].route.getBounds());

    var [type, name] = id.split('-');
    name = name.replace(/^0*/, '');

    const img = `build/img/${this._typeToNames[type]}.png`;

    this.busIcons.push( { id, color, img, name } );
    // doesn't want to propagate changes into view without this hack
    // NgZone didn't work either
    setTimeout(
      () => this._ref.detectChanges()
    );

    // not pure !!!
    function _createStopMarker (e)
    {
      const marker = _L
        .marker({lat: e.lat, lng: e.lng}, {icon: _icons['stop']})
        .bindPopup(e.n)
        .addTo(_map)
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
