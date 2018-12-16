<p align="center">
  <a href="http://synapsium.com">
    <h1 align="center">ngx-scrollbar</h1>
  </a>
</p>

<p align="center">
Ngx-scrollbar is a customizable and lightweight scrollbar based on native browser scrollbar for Angular.
</p>

## Setup

### Installation

Install `ngx-scrollbar` library from `npm`

```bash
npm install @synapsium/ngx-scrollbar --save
```

### Style

Import ngx-scrollbar style into your project `styles.css`

```javascript
@import '../node_modules/@synapsium/ngx-scrollbar/styles/styles.scss';
```

### Module usage

Add `ScrollbarModule` to module

```javascript
import { ScrollbarModule } from 'ngx-scrollbar-dev/scrollbar.module';
import { ScrollbarConfig, SCROLLBAR_CONFIG } from 'ngx-scrollbar-dev/scrollbar.config';

const DEFAULT_SCROLLBAR_CONFIG: ScrollbarConfig = {
  autoHide: true,
  trackbarMinThickness: 17,
  trackbarMaxThickness: 20,
  barMinSize: 20
};

@NgModule({
  ...
  imports: [
    ...
    ScrollbarModule
  ],
  providers: [
    {
      provide: SCROLLBAR_CONFIG,
      useValue: DEFAULT_SCROLLBAR_CONFIG
    }
  ]
})
```

## How to use

Add `scrollbar` directive to the container

```html
<div scrollbar 
    [auto-hide]="false">
    <!-- Your content here... -->
</div>
```
