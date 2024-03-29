import { Directive, ElementRef, AfterViewInit,
         OnDestroy, OnChanges, Optional, Inject, Renderer2, SimpleChanges, Input } from '@angular/core';
import { CLASSNAME } from './constants/classname';
import { ScrollbarConfig, SCROLLBAR_CONFIG, DEFAULT_SCROLLBAR_CONFIG } from './scrollbar.config';
import { EventAction } from './events/event-action';
import { Trackbar } from './models/trackbar';
import { Bar } from './models/bar';
import ResizeObserver from 'resize-observer-polyfill';
import { Axis } from './models/axis';
import { AttachedEvent } from './events/attached-event';
import { ScrollbarContainer } from './models/scrollbar-container';

@Directive({
  selector: '[scrollbar]'
})
export class ScrollbarDirective implements AfterViewInit, OnDestroy, OnChanges {
  @Input() autoHide: boolean;
  @Input() disableScrollbar: boolean;

  private _config: ScrollbarConfig;
  private _model: ScrollbarContainer;
  private _attachedEventList: Array<AttachedEvent> = [];
  private _resizeObserver: ResizeObserver;

  private _containerElement: ElementRef;
  private _maskElement: ElementRef;
  private _offsetElement: ElementRef;
  private _contentElement: ElementRef;
  private _resizeElement: ElementRef;
  private _horizontalTrackbarElement: ElementRef;
  private _horizontalBarElement: ElementRef;
  private _verticalTrackbarElement: ElementRef;
  private _verticalBarElement: ElementRef;

  /**
   * Represents scrollbar constructor.
   * @param element - Current element
   * @param renderer - Renderer service
   */
  constructor(private _element: ElementRef, private _renderer: Renderer2,
              @Optional() @Inject(SCROLLBAR_CONFIG) private _injectedConfig: ScrollbarConfig) { }
  
  /**
   * AfterViewInit lifecycle.
   */
  ngAfterViewInit(): void {
    if(!this.disableScrollbar) {
      this._initConfig();
      this._initDOM();
      this._initScrollbar();
      this._initListeners();
    }
  }

  /**
   * OnChanges lifecycle.
   * @param changes - Changes
   */
  ngOnChanges(changes: SimpleChanges): void {
    // if !autohide => unbind event mouseenter + display scrollbar
    // if autohide => bind event mouseenter
  }

  /**
   * OnDestroy lifecycle.
   */
  ngOnDestroy(): void {
    this._removeAllEventActions();
    this._removeObservers();
  }

  /**
   * Init config.
   */
  private _initConfig(): void {
    this._config = DEFAULT_SCROLLBAR_CONFIG;

    if (this._injectedConfig) {
      Object.assign(this._config, this._injectedConfig);
    }
  }

  /**
   * Init DOM to manage virtual scrollbar.
   * @example
   * <div scrollbar>
   *  <div class="container">
   *    <div class="mask">
   *      <div class="offset">
   *        <div class="content">
   *          <div class="resize">
   *            // content here
   *          </div>
   *        </div>
   *      </div>
   *    </div>
   *  </div>
   *  <div class="scrollbar-trackbar scrollbar-horizontal">
   *    <div class="scrollbar-bar"></div>
   *  </div>
   *  <div class="scrollbar-trackbar scrollbar-vertical">
   *    <div class="scrollbar-bar"></div>
   *  </div>
   * </div>
   */
  private _initDOM(): void {
    this._containerElement = this._createElement('div', [CLASSNAME.CONTAINER]);
    this._maskElement = this._createElement('div', [CLASSNAME.MASK]);
    this._offsetElement = this._createElement('div', [CLASSNAME.OFFSET]);
    this._contentElement = this._createElement('div', [CLASSNAME.CONTENT]);
    this._resizeElement = this._createElement('div', [CLASSNAME.RESIZE]);
    this._horizontalTrackbarElement = this._createElement('div', [CLASSNAME.TRACKBAR, CLASSNAME.HORIZONTAL_TRACKBAR]);
    this._horizontalBarElement = this._createElement('div', [CLASSNAME.BAR]);
    this._verticalTrackbarElement = this._createElement('div', [CLASSNAME.TRACKBAR, CLASSNAME.VERTICAL_TRACKBAR]);
    this._verticalBarElement = this._createElement('div', [CLASSNAME.BAR]);

    if (this._element.nativeElement.childNodes) {
      while (this._element.nativeElement.childNodes.length > 0) {
        this._renderer.appendChild(this._resizeElement, this._element.nativeElement.childNodes[0]);
      }
    }

    this._renderer.appendChild(this._contentElement, this._resizeElement);
    this._renderer.appendChild(this._offsetElement, this._contentElement);
    this._renderer.appendChild(this._maskElement, this._offsetElement);
    this._renderer.appendChild(this._containerElement, this._maskElement);
    this._renderer.appendChild(this._element.nativeElement, this._containerElement);

    this._renderer.appendChild(this._horizontalTrackbarElement, this._horizontalBarElement);
    this._renderer.appendChild(this._element.nativeElement, this._horizontalTrackbarElement);

    this._renderer.appendChild(this._verticalTrackbarElement, this._verticalBarElement);
    this._renderer.appendChild(this._element.nativeElement, this._verticalTrackbarElement);

    const elementStyle = getComputedStyle(this._element.nativeElement);
    const top = `${elementStyle.paddingTop}`;
    const bottom = `${elementStyle.paddingBottom}`;
    const left = `${elementStyle.paddingLeft}`;
    const right = `${elementStyle.paddingRight}`;

    this._renderer.setStyle(this._contentElement, 'padding', `${top} ${right} ${bottom} ${left}`);
  }

  /**
   * Init listener to action.
   */
  private _initListeners(): void {

    const eventActions = [
      {
        element: this._element.nativeElement,
        events: ['mouseenter'],
        call: (e: any) => { this._updateBarVisibilityUI(true); },
        condition: () => this.autoHide
      },
      {
        element: this._element.nativeElement,
        events: ['mouseleave'],
        call: (e: any) => { this._updateBarVisibilityUI(false); },
        condition: () => this.autoHide
      },
      {
        element: this._contentElement,
        events: ['scroll'],
        call: (e: any) => { this._onScroll(e); }
      },
      {
        element: this._verticalBarElement,
        events: ['mousedown',
          'touchstart'],
        call: (e: any) => { this._onSelectBarStart(Axis.Y, e); }
      },
      {
        element: this._horizontalBarElement,
        events: ['mousedown',
          'touchstart'],
        call: (e: any) => { this._onSelectBarStart(Axis.X, e); }
      }
    ];

    this._attachEventAction(eventActions);

    if ('ResizeObserver' in window) {
      this._resizeObserver = new ResizeObserver(() => this._initScrollbar());
      this._resizeObserver.observe(this._element.nativeElement);
      this._resizeObserver.observe(document.querySelector("."+CLASSNAME.RESIZE));
    }
    else {
      const resizeAction = [{
        element: window,
        events: ['resize'],
        call: (e: any) => { this._initScrollbar(); }
      }]
      this._attachEventAction(resizeAction);
    }
  }

  private _initModel(): void {
    const elementStyle = getComputedStyle(this._element.nativeElement);
    this._model = new ScrollbarContainer();
    this._model.marginTop = `${elementStyle.paddingTop}`;
    this._model.marginBottom = `${elementStyle.paddingBottom}`;
    this._model.marginLeft = `${elementStyle.paddingLeft}`;
    this._model.marginRight = `${elementStyle.paddingRight}`;

    const horizontalTrackbar = new Trackbar();
    horizontalTrackbar.axis = Axis.X;
    horizontalTrackbar.size = (<any>this._element.nativeElement).clientWidth;
    horizontalTrackbar.thickness = this._calcThicknessBar(Axis.X);
    horizontalTrackbar.bar = new Bar();
    horizontalTrackbar.bar.element = this._horizontalBarElement;
    horizontalTrackbar.bar.size = this._calcSizeBar(Axis.X, horizontalTrackbar.thickness);
    horizontalTrackbar.bar.offset = this._calcPositionBar(Axis.X, horizontalTrackbar.bar.size);
    this._model.scrollbar.trackbars.push(horizontalTrackbar);

    const verticalTrackbar = new Trackbar();
    verticalTrackbar.axis = Axis.Y;
    verticalTrackbar.size = (<any>this._element.nativeElement).clientHeight;
    verticalTrackbar.thickness = this._calcThicknessBar(Axis.Y);
    verticalTrackbar.bar = new Bar();
    verticalTrackbar.bar.element = this._verticalBarElement;
    verticalTrackbar.bar.size = this._calcSizeBar(Axis.Y, verticalTrackbar.thickness);
    verticalTrackbar.bar.offset = this._calcPositionBar(Axis.Y, verticalTrackbar.bar.size);
    this._model.scrollbar.trackbars.push(verticalTrackbar);
  }

  private _initScrollbar(): void {
    this._initModel();
    
    const horizontalTrackbar = this._model.scrollbar.trackbars.find(t => t.axis === Axis.X);
    const verticalTrackbar = this._model.scrollbar.trackbars.find(t => t.axis === Axis.Y);

    this._hideNativeScrollbar(horizontalTrackbar.thickness, verticalTrackbar.thickness);
    this._updateResizeContainerSize(horizontalTrackbar.thickness, verticalTrackbar.thickness);
    this._updateBarVisibilityUI(!this.autoHide);
    
    this._updateThicknessBarUI(horizontalTrackbar.axis, horizontalTrackbar.thickness);
    this._updateBarSizeUI(horizontalTrackbar.axis, horizontalTrackbar.bar);
    this._updateBarPositionUI(horizontalTrackbar.axis, horizontalTrackbar.bar);

    this._updateThicknessBarUI(verticalTrackbar.axis, verticalTrackbar.thickness);
    this._updateBarSizeUI(verticalTrackbar.axis, verticalTrackbar.bar);
    this._updateBarPositionUI(verticalTrackbar.axis, verticalTrackbar.bar);
  }

  /**
  * Scroll event.
  * @param e - Scroll event
  */
  private _onScroll(e: MouseEvent): void {
    const horizontalBar = this._model.scrollbar.trackbars.find(t => t.axis === Axis.X).bar;
    const verticalBar = this._model.scrollbar.trackbars.find(t => t.axis === Axis.Y).bar;
    horizontalBar.offset = this._calcPositionBar(Axis.X, horizontalBar.size);
    verticalBar.offset = this._calcPositionBar(Axis.Y, verticalBar.size);

    window.requestAnimationFrame(() => { this._updateBarPositionUI(Axis.X, horizontalBar); });
    window.requestAnimationFrame(() => { this._updateBarPositionUI(Axis.Y, verticalBar); });
  }

  /**
   * On drag scrollbar start event.
   * @param  axis - X for horizontal, Y for vertical
   * @param  e - Mouse event
   */
  private _onSelectBarStart(axis: Axis, e: MouseEvent): void {
    e.preventDefault();
    e.stopPropagation();

    const trackbar = this._model.scrollbar.trackbars.find(t => t.axis === axis);
    trackbar.bar.dragging = true;
    trackbar.bar.pointerOffset = axis === Axis.X ? e.pageX : e.pageY;
    trackbar.bar.dragOffset = trackbar.bar.offset;

    const dragEventAction = [
      {
        element: window,
        events: ['mousemove'],
        call: (event: MouseEvent) => { this._onSelectBarMove(event, trackbar); }
      },
      {
        element: window,
        events: ['mouseup',
          'touchend'],
        call: (event: MouseEvent) => { this._onSelectBarEnd(event); }
      }
    ];

    this._attachEventAction(dragEventAction);
  }

  /**
   * On drag scrollbar move event.
   * @param e - Mouse event
   * @param trackbar - Trackbar
   */
  private _onSelectBarMove(e: MouseEvent, trackbar: Trackbar): void {
    const position = trackbar.axis === Axis.X ? e.pageX : e.pageY;
    const moveOffset = position - trackbar.bar.pointerOffset;
    const maxOffset = trackbar.size - trackbar.bar.size;
    
    if((trackbar.bar.dragOffset + moveOffset) >= 0 && (trackbar.bar.dragOffset + moveOffset) <= maxOffset) {
      trackbar.bar.offset = trackbar.bar.dragOffset + moveOffset;
      const scrollTo = this._calcPositionContent(trackbar);
      this._scroll(trackbar.axis, scrollTo);
    }
  }

  /**
   * On drag scrollbar end event.
   * @param e - Mouse event
   */
  private _onSelectBarEnd(e: MouseEvent): void {
    this._removeEventAction(window, 'mousemove');
    this._removeEventAction(window, 'mouseup');
    this._removeEventAction(window, 'touchend');
  }

  /**
   * Update thickness bar.
   * Thickness bar reduces when zoom in
   * and increases with zoom out
   * @param axis - X for horizontal, Y for vertical
   * @param thickness - thickness
   */
  private _updateThicknessBarUI(axis: Axis, thickness: number): void {
    if (axis === Axis.X) {
      this._renderer.setStyle(this._horizontalTrackbarElement, 'height', `${thickness}px`);
    } else {
      this._renderer.setStyle(this._verticalTrackbarElement, 'width', `${thickness}px`);
    }
  }

  /**
   * Update bar visibility.
   * @param visible - Is visible
   */
  private _updateBarVisibilityUI(visible: boolean): void {
    if (visible) {
      this._renderer.addClass(this._verticalBarElement, CLASSNAME.BAR_VISIBLE);
      this._renderer.addClass(this._horizontalBarElement, CLASSNAME.BAR_VISIBLE);
    } else {
      this._renderer.removeClass(this._verticalBarElement, CLASSNAME.BAR_VISIBLE);
      this._renderer.removeClass(this._horizontalBarElement, CLASSNAME.BAR_VISIBLE);
    }
  }

  /**
   * Update bar size.
   * @param axis - X for horizontal, Y for vertical
   * @param bar - bar
   */
  private _updateBarSizeUI(axis: Axis, bar: Bar): void {
    if (axis === Axis.X) {
      this._renderer.setStyle(bar.element, 'width', `${bar.size}px`);
    } else {
      this._renderer.setStyle(bar.element, 'height', `${bar.size}px`);
    }
  }

  /**
   * Update bar position.
   * @param axis - X for horizontal, Y for vertical
   * @param bar - bar
   */
  private _updateBarPositionUI(axis: Axis, bar: Bar): void {
    if (axis === Axis.X) {
      this._renderer.setStyle(bar.element, 'transform', `translate3d(${bar.offset}px, 0, 0)`);
    } else {
      this._renderer.setStyle(bar.element, 'transform', `translate3d(0, ${bar.offset}px, 0)`);
    }
  }

  /**
   * Update resize container size.
  * @param offsetRight - Right offset
   * @param offsetBottom - Bottom offset
   */
  private _updateResizeContainerSize(offsetRight: number, offsetBottom: number): void {
    this._renderer.setStyle(this._resizeElement, 'min-height', `calc(100% - ${offsetBottom}px)`);
    this._renderer.setStyle(this._resizeElement, 'min-width', `calc(100% - ${offsetRight}px)`);
    this._renderer.setStyle(this._resizeElement, 'max-width', `calc(100% - ${offsetRight}px)`);
  }

  /**
   * Scroll.
   * @param axis - X for horizontal, Y for vertical
   * @param scrollTo - scrollTo
   */
  private _scroll(axis: Axis, scrollTo: number): void {
    if (axis === Axis.X) {
      (<any>this._contentElement).scrollLeft = scrollTo;
    } else {
      (<any>this._contentElement).scrollTop = scrollTo;
    }
  }

  /**
   * Hide native scrollbar using offset.
   * @param offsetRight - Right offset
   * @param offsetBottom - Bottom offset
   */
  private _hideNativeScrollbar(offsetRight: number, offsetBottom: number): void {
    this._renderer.setStyle(this._offsetElement, 'right', `-${offsetRight + 1}px`);
    this._renderer.setStyle(this._offsetElement, 'bottom', `-${offsetBottom + 1}px`);
  }

  /**
   * Calculate position bar.
   * @param axis - X for horizontal, Y for vertical
   * @param sizeBar - size bar
   * @returns offset.
   */
  private _calcPositionBar(axis: Axis, sizeBar: number): number {
    if (axis === Axis.X) {
      const contentWidthSize = (<any>this._contentElement).scrollWidth;
      const contentLeftOffset = (<any>this._contentElement).scrollLeft;
      const hostWidthSize = (<any>this._element.nativeElement).clientWidth;
      const ratioLeft = contentLeftOffset / (contentWidthSize - hostWidthSize);
      return (hostWidthSize - sizeBar) * ratioLeft;
    } else {
      const contentHeightSize = (<any>this._contentElement).scrollHeight;
      const contentTopOffset = (<any>this._contentElement).scrollTop;
      const hostHeightSize = (<any>this._element.nativeElement).clientHeight;
      const ratioTop = contentTopOffset / (contentHeightSize - hostHeightSize);
      return (hostHeightSize - sizeBar) * ratioTop;
    }
  }

  /**
   * Calculate position of content.
   * @param trackbar - trackbar
   * @returns content offset.
   */
  private _calcPositionContent(trackbar: Trackbar): number {
    if (trackbar.axis === Axis.X) {
      const contentWidthSize = (<any>this._contentElement).scrollWidth;
      const ratio = contentWidthSize / trackbar.size;
      return trackbar.bar.offset * ratio;

    } else {
      const contentHeightSize = (<any>this._contentElement).scrollHeight;
      const ratio = contentHeightSize / trackbar.size;
      return trackbar.bar.offset * ratio;
    }
  }

  /**
   * Calculate size bar.
   * @param axis - X for horizontal, Y for vertical
   * @returns size.
   */
  private _calcSizeBar(axis: Axis, offset: number): number {
    const contentSize = axis === Axis.X ? (<any>this._contentElement).scrollWidth - offset : (<any>this._contentElement).scrollHeight - offset;
    const hostSize = axis === Axis.X ? (<any>this._element.nativeElement).clientWidth : (<any>this._element.nativeElement).clientHeight;

    if (hostSize + 1 >= contentSize || contentSize === 0) {
      return 0;
    }

    const sizeBar = ~~((hostSize * hostSize) / (contentSize + offset));

    if (this._config.barMaxSize > 0 && sizeBar > this._config.barMaxSize) {
      return this._config.barMaxSize;
    } else if (this._config.barMinSize > 0 && sizeBar < this._config.barMinSize) {
      return this._config.barMinSize;
    } else {
      return sizeBar;
    }
  }

  /**
   * Calculate thickness bar.
   * @param axis - X for horizontal, Y for vertical
   * @returns thickness.
   */
  private _calcThicknessBar(axis: Axis): number {
    const thickness = axis === Axis.X ? (<any>this._contentElement).offsetWidth - (<any>this._contentElement).clientWidth :
                  (<any>this._contentElement).offsetHeight - (<any>this._contentElement).clientHeight;

    if (thickness > this._config.trackbarMaxThickness) {
      return this._config.trackbarMaxThickness;
    } else if (thickness < this._config.trackbarMinThickness) {
      return this._config.trackbarMinThickness;
    } else {
      return thickness;
    }
  }

  /**
   * Create element and set class names.
   * @param element - Current element
   * @param classnames - list of class name
   * @returns element created.
   */
  private _createElement(element: string, classnames: Array<string>): ElementRef {
    const result = this._renderer.createElement(element);
    for (const classname of classnames) {
      this._renderer.addClass(result, classname);
    }
    return result;
  }

  /**
   * Attach event to action.
   * @param eventActions - Events
   */
  private _attachEventAction(eventActions: Array<EventAction>): void {
    for (const eventAction of eventActions) {
      if (eventAction.condition) {
        if ((typeof eventAction.condition === 'function' && !eventAction.condition())) {
          continue;
        }
      }

      eventAction.events.forEach((eventName) => {
        if (!this._attachedEventList.some(ae => ae.element === eventAction.element && ae.event === eventName)) {
          const attachedEvent = new AttachedEvent();
          attachedEvent.element = eventAction.element;
          attachedEvent.event = eventName;
          attachedEvent.remove = eventAction.remove;
          attachedEvent.unlisten = this._renderer.listen(eventAction.element, eventName, eventAction.call);
          this._attachedEventList.push(attachedEvent);
        }
      });
    }
  }

  /**
   * Remove event to action.
   * @param element - element
   * @param eventName - event
   */
  private _removeEventAction(element: any, eventName: string): void {
    const attachedEventIndex = this._attachedEventList.findIndex(ae => ae.element === element && ae.event === eventName);

    if (attachedEventIndex >= 0) {
      this._attachedEventList[attachedEventIndex].unlisten();
      if (this._attachedEventList[attachedEventIndex].remove) {
        this._attachedEventList[attachedEventIndex].remove();
      }

      this._attachedEventList.splice(attachedEventIndex, 1);
    }
  }

  /**
   * Remove all event to action.
   */
  private _removeAllEventActions(): void {
    for (const attachedEvent of this._attachedEventList) {
      attachedEvent.unlisten();
      if (attachedEvent.remove) {
        attachedEvent.remove();
      }
    }
  }

  private _removeObservers(): void {
    this._resizeObserver && this._resizeObserver.disconnect();
  }
}
