import {Component, ViewChild, OnInit} from '@angular/core';
import { HTTP_PROVIDERS } from '@angular/http';
import 'rxjs/Rx';
import {ionicBootstrap, Platform, MenuController, Nav} from 'ionic-angular';
import {StatusBar} from 'ionic-native';
import {MapPage} from './pages/map/map';
import {ListPage} from './pages/list/list';

import {GortransApiService} from './services/gortrans-api-service';


@Component({
  templateUrl: 'build/app.html',
  providers: [HTTP_PROVIDERS, GortransApiService]
})
class MyApp implements OnInit {
  @ViewChild(Nav) nav: Nav;

  public app: any;
  rootPage: any = MapPage;

  // private _routes: routeType [];

  constructor(
    private platform: Platform,
    private menu: MenuController
    ,

    private _gortransService: GortransApiService
  ) {
    this.initializeApp();
  }

  initializeApp() {
    this.platform.ready().then(() => {
      // Okay, so the platform is ready and our plugins are available.
      // Here you can do any higher level native things you might need.
      StatusBar.styleDefault();
    });
    var menuInter = setInterval(
      () =>
      {
        if (this.menu.getMenus().length > 0)
        {
          this._registerBackButtonMenuHandler();
          clearInterval(menuInter);
        }
      },
      100
    );

  }

  public ngOnInit (): void
  {
    // this._gortransService
    //   .getRoutes()
    //   .subscribe(
    //     routes => this._routes = routes,
    //     err => console.log(err)
    //   )
    //   ;
  }

  // openPage(page)
  // {
  //   // close the menu when clicking a link from the menu
  //   this.menu.close();
  //   // navigate to the new page if it is not the current page
  //   this.nav.setRoot(page.component);
  // }

  private _registerBackButtonMenuHandler()
  {
    var unregisterBackButton = undefined;

    // register back button handler when menu has been opened
    this.menu.getMenus()[0].ionOpen.subscribe(
      event =>
      {
        unregisterBackButton = this.platform.registerBackButtonAction(
          () => {
            if (this.menu.getMenus()[0].isOpen)
            {
              this.menu.close();
            }
          },
          10
        );
      }
    );
    // remove listener when closed
    this.menu.getMenus()[0].ionClose.subscribe(
      event =>
      {
        if (unregisterBackButton)
        {
          unregisterBackButton();
          unregisterBackButton = undefined;
        }
      }
    );
  }
}

ionicBootstrap(MyApp);
