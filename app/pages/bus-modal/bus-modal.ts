import { Component, OnInit } from '@angular/core';
import { Modal, NavController, ViewController, NavParams } from 'ionic-angular';

@Component({
  templateUrl: 'build/pages/bus-modal/bus-modal.html'
})
export class BusModal implements OnInit
{
  public busData:
  {
    lat: string,
    lng: string,
    name: string,
    type: string,
    table: string,
    time: string
  };

  public stops:
  {
    title: string,
    time:  string
  } [];

  constructor
  (
    private viewCtrl: ViewController,
    private params: NavParams
  )
  {
    this.busData = params.get('bus');

    this.busData.time = 'обновлено в ' + this.busData.time.split(' ')[1];

    this.stops =
      this.busData.table
      .split('|')
      .map(
        e =>
        {
          return e.split('+');
        }
      )
      .reduce(
        (acc: any [], e) =>
        {
          if (e.length > 1)
          {
            acc.push({
              title: e[1],
              time: e[0]
            });
          }
          return acc;
        },
        []
      )
      ;
  }

  public ngOnInit (): void
  {
  }

  public close (): void
	{
    this.viewCtrl.dismiss();

    /** show all buses back */
    var buses = <NodeListOf<HTMLDivElement>>document.querySelectorAll('.bus-marker');
    for (var i = 0; i < buses.length; i++)
    {
      buses[i].style.opacity = '1';
    }
  }
}