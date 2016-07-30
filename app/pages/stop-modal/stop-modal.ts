import { Component, OnInit } from '@angular/core';
import { Modal, NavController, ViewController, NavParams } from 'ionic-angular';

import { TransportService } from '../../services/transport-service';

@Component({
  templateUrl: 'build/pages/stop-modal/stop-modal.html'
})
export class StopModal implements OnInit
{
  public stopData:
  {
    id: string,
    lat: string,
    lng: string,
    name: string,
    type: string
  };

  public buses:
  {
    title: string,
    type:  string,
    dir:   string,
    next:  string
  } [];

  public timeToRefresh: string;

  public noBuses: boolean;

  private _unsubscribeFromStops: any;

  constructor
  (
    private viewCtrl: ViewController,
    private params: NavParams,
    private _transportService: TransportService
  )
  {
    this.stopData = params.get('stop');

    this.buses = [];

    this.timeToRefresh = '';
  }

  public ngOnInit (): void
  {
    this._unsubscribeFromStops =
      this._transportService.subscribeToStops(
        this.stopData.id,
        this._processForecasts.bind(this),
        this._processTime.bind(this)
      );

    this.noBuses = false;
  }

  public close (): void
	{
    this._unsubscribeFromStops();
    this.viewCtrl.dismiss();

    /** show all stops back */
    var stops = <NodeListOf<HTMLDivElement>>document.querySelectorAll('.stop-markers-visibility');
    for (var i = 0; i < stops.length; i++)
    {
      stops[i].style.opacity = '1';
    }

    // clear state in local storage
    localStorage.setItem('displayed-stop', '' );
  }

  private _processForecasts
  (
    forecasts: Forecast []
  ): void
  {
    this.buses =
      forecasts.map(
        e => {
          var out =
          {
            title: e.title,
            dir: e.stop_end,
            next: ''+e.markers[0].time,
            type: ''
          };
          switch (e.typetr) {
						case '1':
							out.type = 'а.';
						break;
						case '2':
							out.type = 'тр.';
						break;
						case '3':
							out.type = 'тм.';
						break;
						case '8':
							out.type = 'м.т.';
						break;
					}
          return out;
        }
      )
      .sort(
        (e1, e2) =>
        {
          return  +e1.next > +e2.next
                    ? 1
                    : +e1.next < +e2.next
                      ? -1
                      : 0;
        }
      )
      .map(
        e =>
        {
          e.next = +e.next > 0 ? e.next : '< 1';
          return e;
        }
      );

    if (this.buses.length === 0)
    {
      this.noBuses = true;
    }
    else
    {
      this.noBuses = false;
    }
  }

  private _processTime (time: string)
  {
    this.timeToRefresh = time;
  }
}