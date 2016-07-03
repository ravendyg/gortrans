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

  public buses: any [];
  public smallBuses: any [];
  public trams: any [];
  public trolleys: any [];

  public routeName: string;

  private _routes: routesType;

  constructor(
    private platform: Platform,
    private menu: MenuController,
    private _gortransService: GortransApiService
  ) {
    this.initializeApp();

    this.buses = [];
    this.smallBuses = [];
    this.trams = [];
    this.trolleys = [];

    this.routeName = '';
  }

  initializeApp (): void
  {
    this.platform.ready().then(() => {
      // Okay, so the platform is ready and our plugins are available.
      // Here you can do any higher level native things you might need.
      StatusBar.styleDefault();
    });
  }

  public ngOnInit (): void
  { // try to set up 'close menu on back button'
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
    // get list of marsh
    this._gortransService.getRoutes(
      routes =>
      {
        this._routes = routes;
      }
    );
  }

  public onSearchInput (): void
  {
    if (this.routeName.length > 0)
    {
      this.buses = this._routes.buses.filter( e => !!e.name.match(this.routeName) );
      this.smallBuses = this._routes.smallBuses.filter( e => !!e.name.match(this.routeName) );
      this.trams = this._routes.trams.filter( e => !!e.name.match(this.routeName) );
      this.trolleys = this._routes.trolleys.filter( e => !!e.name.match(this.routeName) );
    }
    else
    {
      this.buses = this.smallBuses = this.trams = this.trolleys = [];
    }
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
