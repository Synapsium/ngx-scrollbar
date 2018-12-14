import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';

import { ScrollbarModule } from 'ngx-scrollbar-dev/scrollbar.module';
import { ScrollbarConfig, SCROLLBAR_CONFIG } from 'ngx-scrollbar-dev/scrollbar.config';

const DEFAULT_SCROLLBAR_CONFIG: ScrollbarConfig = {
  autoHide: true,
  trackbarMinThickness: 17,
  trackbarMaxThickness: 20,
  barMinSize: 20
};

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    ScrollbarModule
  ],
  providers: [
    {
      provide: SCROLLBAR_CONFIG,
      useValue: DEFAULT_SCROLLBAR_CONFIG
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
