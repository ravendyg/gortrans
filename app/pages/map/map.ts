import {Component, OnInit, AfterViewChecked, ChangeDetectorRef} from '@angular/core';
import {Modal, Page, NavController, ViewController} from 'ionic-angular'

import { Observable } from 'rxjs/Observable';
import {TransportService} from '../../services/transport-service';

import {StopModal} from '../stop-modal/stop-modal';

var _L: iL;
var _map: iMap;

var _buses: {id: string, marker: any} [];
var _icons: {[id: string]: iIcon};

var _labelsShown = false;

var userPosition:latLng =
{
  lat: 0,
  lng: 0
};


@Component({
  templateUrl: 'build/pages/map/map.html'
})
export class MapPage implements OnInit, AfterViewChecked
{

  private _trackMapSize: boolean;
  private _actualRouteLines: actualRoute;
  private _swipeouts: any [];
  private _stopsHidden: boolean;

  // constants
  private _stopRadius: number;
  private _routeColors: string [];
  private _typeToNames: {[id: string]: string};

  public busIcons: busIcon [];

  public timeToNextUpdateMessage: string;

  public networkStatus: boolean;

  constructor(
    private _transportService: TransportService,
    private _navController: NavController
    // private _ref: ChangeDetectorRef
  )
  {
    this._trackMapSize = true;
    this._actualRouteLines = {};

    this._stopRadius = 15;

    _buses = [];

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

    this.timeToNextUpdateMessage = '';

    this.networkStatus = true;

    _icons = {};
  }

  public ngOnInit (): void
  {
    var vm = this;
    // map intialization
    var initMapSettngs, startZoom, startCoords;
    _L = window['L'];
    const southWest = _L.latLng(30, 10),
          northEast = _L.latLng(80, 200),
          bounds = _L.latLngBounds(southWest, northEast);
    try
    {
      var mapStr = localStorage.getItem('map');
      initMapSettngs = JSON.parse(mapStr);
      startCoords =
      {
        lat: initMapSettngs.center.lat || 54.908593335436926,
        lng: initMapSettngs.center.lng || 83.0291748046875
      };
      startZoom = initMapSettngs.zoom | 11;
    }
    catch (e)
    {
      startCoords =
      {
        lat: 54.908593335436926,
        lng: 83.0291748046875
      };
      startZoom = 11;
    }

    this._stopsHidden = true;

    _map = _L.map('map', {
        minZoom: 4,
        maxBounds: bounds
    }).setView(startCoords, startZoom);
window['mm'] = _map;
    var tileLayer = _L.tileLayer.provider('OpenStreetMap.HOT').addTo(_map);

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
            _changeCSSRule('.bus-stop-marker', " {}");
            this._stopsHidden = false;
          }
        }
        else
        { // hide
          if (!this._stopsHidden)
          {
            _changeCSSRule('.bus-stop-marker', " { visibility: hidden !important; }");
            this._stopsHidden = true;
          }
        }
      }).bind(this)
    );

    // restore state
    tileLayer.on( 'load', restoreState );
    function restoreState ()
    {
      var routesStr = localStorage.getItem('routes'), routes;
      if (routesStr && routesStr !== 'undefined')
      {
        routes = JSON.parse(routesStr);
        for (var k = 0; k < routes.length; k++)
        {
          vm._transportService.selectRoute(routes[k].type, routes[k].route, routes[k].name, true);
        }
      }

      var stopModalStr = localStorage.getItem('displayed-stop');
      if (stopModalStr && stopModalStr !== 'undefined')
      {
        var targ = document.createElement('div');
        Object.assign( targ.dataset, JSON.parse(stopModalStr) );
        targ.addEventListener(
          'click',
          event => vm.showStopModal(event, true)
        );
        var ev = new MouseEvent('click');
        targ.dispatchEvent(ev);
      }

      tileLayer.off( 'load', restoreState );
    };

    // subscribe to searched routes updates
    this._transportService.subscribeForAddLineOnMap(
      this._newLineOnMapCb.bind(this)
    );

    // subscribe for bus positions update
    this._transportService.subscribeForMarkers(
      this._processBusMarkers.bind(this)
    );

    // subscribe for next update time left time change
    this._transportService.subscribeForNextUpdateTimeChange(
      (message: string) =>
      {
        if (message.length > 0 && message.length < 3)
        { // number
          message = 'До обновления: ' + message;
        }
        this.timeToNextUpdateMessage = message;
      }
    );

    // prepare icons
    _icons['stop'] =  _L.icon({
      iconUrl: `build/img/bus-stop.png`,
      iconSize: [30, 30],
      className: 'bus-stop-marker stop-markers-visibility'
    });

    for (var keyType in this._typeToNames)
    {
      for (var angle = 0; angle < 360; angle += 45)
      {
        _icons[`${keyType}-${angle}`] =
          _L.icon({
            iconUrl: `build/img/transport/${this._typeToNames[keyType]}-${angle}.png`,
            iconSize: [46, 42]
          });
      }
    }

    // icon menu manipulation
    document.addEventListener('touchstart', this._initSwipeout.bind(this));

    // user's position
    var userMarker;

    navigator.geolocation.watchPosition(
      position =>
      {
        if (!userMarker)
        { // first run
          userPosition =
          {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          userMarker =  _L.marker(userPosition);
          userMarker.addTo(_map);
        }
        else
        {
          userPosition =
          {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          _map.removeLayer( userMarker );
          userMarker.setLatLng(userPosition);
          userMarker.addTo(_map);
        }
      },
      e =>
      {
        console.log(e)
      },
      { maximumAge: 10000, timeout: 5000, enableHighAccuracy: false }
    );

    // internet commection status
    var netStatInt =
      setInterval(
        () =>
        {
          if (
            ( navigator['network'].connection.type.toLowerCase().match('no network')  ||
              navigator['network'].connection.type === 'none' )                       &&
            this.networkStatus
          )
          {
            this.networkStatus = false;
            window['plugins'].toast.show('Нет соединения с интернетом, работаю в оффлайн режиме', "long", 'bottom');
          }
          else if (
            !( navigator['network'].connection.type.toLowerCase().match('no network') ||
              navigator['network'].connection.type === 'none' )                       &&
            !this.networkStatus
          )
          {
            this.networkStatus = true;
            window['plugins'].toast.show('Соединение с интернетом установлено', "long", 'bottom');
          }

        },
        1000*5
      );

      setInterval(
        saveMapData,
        1000 * 10
      );
      // and on pause
      document.addEventListener( 'pause', saveMapData );
      function saveMapData ()
      {
        localStorage.setItem(
          'map',
          JSON.stringify(
            {
              zoom: _map.getZoom(),
              center: _map.getCenter()
            }
          )
        );
      };
  }

  public zoomToUser ()
  {
    if ( userPosition.lat )
    {
      _map.setView( userPosition );
    }
    else
    {
      window['plugins'].toast.show('Не могу вас найти', "long", 'bottom');
    }
  }

  public showStopModal (ev: MouseEvent, oldState?: boolean)
  {
    const elem = <HTMLDivElement>ev.target;
    if (elem.dataset && elem.dataset['type'] === 'stop')
    { // zoom
      _map.setView(
        {
          lat: +(<String>elem.dataset['lat']),
          lng: +(<String>elem.dataset['lng'])
        }
      );
      // open modal
      let _stopModal = Modal.create(StopModal, {stop: elem.dataset});
      this._navController.present( _stopModal );
      // make emphasis on the selected stop
      _fadeStops(elem.dataset['id']);

      // save state to local storage
      if (!oldState) {
        localStorage.setItem('displayed-stop', JSON.stringify(elem.dataset) );
      }
    }
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

  /** force buses on map positions update */
  public updateBusPositions ()
  {
    this._transportService.refreshPositions();
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

    _hideLabels();

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
              .hideLabel()
              ;
            marker.addTo(_map);
            setTimeout(
              // otherwise they start at some random places?
              () => {
                marker.showLabel();
              },
              1000
            );

            _buses.push({
              id: key,
              marker
            });

          }
        );

        setTimeout(
          // otherwise they start at some random places?
          () => {
            _showLabels();
          },
          1000
        );
      }
    }
  }

  private _newLineOnMapCb
  (
    id: string,
    name: string,
    trass: trassPoint [],
    instead: string,
    oldState?: boolean
  ): void
  {
    if (instead)
    {
      this._removeRouteOnMap(instead);
    }
    this._addRouteOnMap(id, name, trass, oldState);
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

      // update state
      var routesStr = localStorage.getItem('routes'), routes;
      if (routesStr && routesStr !== 'undefined')
      {
        routes = JSON.parse(routesStr);
        var [type, route] = id.split('-');
        routes = routes.filter( e => e.type !== +type || e.route !== route );
      }
      localStorage.setItem('routes', JSON.stringify(routes));
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
  private _addRouteOnMap
  (
    id: string,
    name: string,
    trass: trassPoint [],
    oldState?: boolean
  ): void
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
    if (!oldState) { _map.fitBounds(this._actualRouteLines[id].route.getBounds()); }

    var type = id.split('-')[0];

    const img = `build/img/${this._typeToNames[type]}.png`;

    this.busIcons.push( { id, color, img, name } );

    // not pure !!!
    function _createStopMarker (e)
    {
      const marker = _L
        .marker({lat: e.lat, lng: e.lng}, {icon: _icons['stop']})
        // .bindPopup(e.n)
        .addTo(_map)
        ;
window['mm'] = marker;

      // store stop data into dataset
      marker._icon.dataset.type = 'stop';
      marker._icon.dataset.id   = e.id;
      marker._icon.dataset.name = e.n.replace('"', '\"');
      marker._icon.dataset.lat  = e.lat;
      marker._icon.dataset.lng  = e.lng;

      const out =
      {
        id: e.id,
        marker: marker
      };
      return out;
    }
  }
}


function _changeCSSRule (selector: string, newRule: string): void
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


function _hideLabels ()
{
  _changeCSSRule('.leaflet-label', "{ visibility: hidden !important; }");
  _labelsShown = true;
}

function _showLabels ()
{
  _changeCSSRule('.leaflet-label', "{}");
  _labelsShown = true;
}

/** make all stops except selected transparent */
function _fadeStops (target: string)
{
  var stops = <NodeListOf<HTMLDivElement>>document.querySelectorAll('.stop-markers-visibility');
  for (var i = 0; i < stops.length; i++)
  {
    if (stops[i].dataset['id'] !== target)
    {
      stops[i].style.opacity = '0.3';
    }
  }
}