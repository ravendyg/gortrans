import {Component} from '@angular/core';
import {Modal, NavController, ViewController} from 'ionic-angular';

@Component({
  templateUrl: 'build/pages/stop-modal/stop-modal.html'
})
export class StopModal
{
  constructor ( private viewCtrl: ViewController) {}

  close ()
	{
    this.viewCtrl.dismiss();
  }
}