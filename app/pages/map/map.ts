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

    this._swipeouts = [];
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

    const startClick =
    {
      x: e.clientX,
      y: e.clientY
    };

    const startPosition = {
      x: target.offsetLeft,
      y: target.offsetTop
    };

    const move =
      Observable
        .fromEvent(document, 'touchmove')
        .debounceTime(16)
        .map( (e: TouchEvent) => e.touches[0] )
        .map(
          (e: Touch) =>
          {
            return {
              x: e.clientX - startClick.x,
              y: e.clientY - startClick.y
            }
          }
        )
        .takeUntil( Observable.fromEvent(document,'touchend') )
        ;

    const sub = move.subscribe(
      vl =>
      {
        console.log(vl);
        target.style.transform = `translate(${vl.x}px)`;
      },
      er => {},
      () =>
      {
        if (Date.now() - start < 200)
        {
          console.log('stop');
        }
      }
    );



    // const touch: Observable<any> =
    //   Observable
    //     .create(
    //       observer =>
    //       {
    //         const interId = setInterval(
    //           () => {observer.next()}, 50
    //         )
    //         return () => {
    //           clearInterval(interId);
    //           console.log('touch up');
    //         }
    //       }
    //     )
    //     .takeUntil( Observable.fromEvent(document,'touchend') )
    //     ;
    // touch.subscribe();

    // const mouseMoves =
    //   Observable
    //   .fromEvent(target, 'mousedown')
    //   .map( (e: Event) => { this._trackSwipeoutPosition(e, target); } )
    //   ;

    // var sub =
    //   this._trackSwipeoutPosition.subscribe(
    //     e =>
    //     {
    //       console.log(e)
    //     }
    //   );

    // this._swipeouts.push( { id, sub } );
  }

  private _trackSwipeoutPosition (md: Event, target: HTMLElement): Observable<any>
  {
    const startPosition =
    {
      x: target.offsetLeft,
      y: target.offsetTop
    };

    return Observable
      .fromEvent(document, 'mousemove')
      .bufferTime(100)
      // .map( e => console.log )
      // .takeUntil( Observable.fromEvent(document,'mouseup') )
      // .map(
      //   e => {
      //     return {
      //       x: `${startPosition.x - (start.x - e.clientX)}px`,
      //       y: `${startPosition.y - (start.y - e.clientY)}px`
      //     };
      //   }
      // )
      ;
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
