import {Component, ViewChild, OnInit} from '@angular/core';
import { HTTP_PROVIDERS } from '@angular/http';
import 'rxjs/Rx';
import {ionicBootstrap, Platform, MenuController, Nav} from 'ionic-angular';
import {StatusBar} from 'ionic-native';

import {MapPage} from './pages/map/map';

import {StopModal} from './pages/stop-modal/stop-modal';

import {IndexedDbService} from './services/indexeddb-service';
import {GortransInfoApiService} from './services/gortrans-info-api-service';
import {GortransApiService} from './services/gortrans-api-service';
import {TransportService} from './services/transport-service';
import {ConfigService} from './services/config-service';


@Component({
  templateUrl: 'build/app.html'
})
class MyApp implements OnInit {
  @ViewChild(Nav) nav: Nav;

  public app: any;
  rootPage: any = MapPage;

  public buses: any [];
  public smallBuses: any [];
  public trams: any [];
  public trolleys: any [];

  public searchRouteName: string;

  private _routes: routesType;



  constructor(
    private platform: Platform,
    private menu: MenuController,
    private _gortransService: GortransApiService,
    private _transportService: TransportService
  ) {
    this.initializeApp();

    this.buses = [];
    this.smallBuses = [];
    this.trams = [];
    this.trolleys = [];

    this.searchRouteName = '';
  }

  initializeApp (): void
  {
    this.platform.ready().then(() => {
      // Okay, so the platform is ready and our plugins are available.
      // Here you can do any higher level native things you might need.
      StatusBar.styleDefault();
    });

    document.addEventListener(
      "deviceready",
      function onDeviceReady()
      {
        navigator['splashscreen'].hide();
      },
      false
    );
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
    // get list of route
    this._gortransService.getRoutes(
      routes =>
      {
        this._routes = routes;
      }
    );
  }

  public onSearchInput (): void
  {
    if (this.searchRouteName.length > 0)
    {
      this.buses = this._routes.buses.filter( e => !!e.name.match(this.searchRouteName) );
      this.smallBuses = this._routes.smallBuses.filter( e => !!e.name.match(this.searchRouteName) );
      this.trams = this._routes.trams.filter( e => !!e.name.match(this.searchRouteName) );
      this.trolleys = this._routes.trolleys.filter( e => !!e.name.match(this.searchRouteName) );
    }
    else
    {
      this.buses = this.smallBuses = this.trams = this.trolleys = [];
    }
  }

  public selectRoute (type: number, route: string, name: string): void
  {
    this._transportService.selectRoute(type, route, name);
    this.menu.getMenus()[0].close();

    // save state
    var routesStr = localStorage.getItem('routes'), routes;
    if (routesStr && routesStr !== 'undefined')
    {
      routes = JSON.parse(routesStr);
      // do not make duplicates
      for (var t = 0; t < routes.length; t++)
      {
        if (routes[t].type === type && routes[t].route === route)
        {
          return;
        }
      }
      if (routes.length > 2)
      {
        routes = routes.slice(1);
      }
    }
    else
    {
      routes = [];
    }
    routes.push({ type, route, name });
    localStorage.setItem('routes', JSON.stringify(routes));
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
        // set tel input, default didn't work
        (<HTMLInputElement>document
          .getElementById('route-search')
          .querySelector('.searchbar-input')
        ).type = 'tel';
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

ionicBootstrap(
  MyApp,
  [
    HTTP_PROVIDERS,
    ConfigService,
    GortransInfoApiService,
    GortransApiService,
    IndexedDbService,
    TransportService,
    StopModal
  ]
);
