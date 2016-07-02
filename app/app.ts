import {Component, ViewChild} from '@angular/core';
import {ionicBootstrap, Platform, MenuController, Nav} from 'ionic-angular';
import {StatusBar} from 'ionic-native';
import {MapPage} from './pages/map/map';
import {ListPage} from './pages/list/list';


@Component({
  templateUrl: 'build/app.html'
})
class MyApp {
  @ViewChild(Nav) nav: Nav;

  public app: any;

  // make HelloIonicPage the root (or first) page
  rootPage: any = MapPage;
  pages: Array<{title: string, component: any}>;

  constructor(
    private platform: Platform,
    private menu: MenuController
  ) {
    this.initializeApp();

    // set our app's pages
    this.pages = [
      { title: 'Map', component: MapPage },
      // { title: 'My First List', component: ListPage }
    ];
  }

  initializeApp() {
    this.platform.ready().then(() => {
      // Okay, so the platform is ready and our plugins are available.
      // Here you can do any higher level native things you might need.
      StatusBar.styleDefault();

      this._registerBackButtonMenuHandler();
    });
  }

  openPage(page)
  {
    // close the menu when clicking a link from the menu
    this.menu.close();
    // navigate to the new page if it is not the current page
    this.nav.setRoot(page.component);
  }

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
