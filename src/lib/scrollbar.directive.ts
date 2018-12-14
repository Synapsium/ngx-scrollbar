import { Directive, ElementRef, OnInit, AfterViewInit, OnDestroy, OnChanges, Optional, Inject, Renderer2, SimpleChanges, Input } from '@angular/core';
import { CLASSNAME } from './constants/classname';
import { ScrollbarConfig, SCROLLBAR_CONFIG, DEFAULT_SCROLLBAR_CONFIG } from './scrollbar.config';
import { EventAction} from './events/event-action';
import { Trackbar } from './models/trackbar';
import { Bar } from './models/bar';
import { Scrollbar } from './models/scrollbar';
import { Axis } from './models/axis';
import { AttachedEvent } from './events/attached-event';

@Directive({
  selector: '[scrollbar]'
})
export class ScrollbarDirective implements OnInit, AfterViewInit, OnDestroy, OnChanges{
  @Input() autoHide:boolean;

  private _config: ScrollbarConfig;
  private _scrollbar: Scrollbar;
  private _attachedEventList: Array<AttachedEvent> = [];

  private _containerElement: ElementRef;
  private _maskElement: ElementRef;
  private _offsetElement: ElementRef;
  private _contentElement: ElementRef;
  private _horizontalTrackbarElement: ElementRef;
  private _horizontalBarElement: ElementRef;
  private _verticalTrackbarElement: ElementRef;
  private _verticalBarElement: ElementRef;
  

  /**
   * Represents scrollbar constructor.
   * @constructor
   * @param {ElementRef} element - Current element
   * @param {Renderer2} renderer - Renderer service
   */
  constructor(private _element: ElementRef, private _renderer: Renderer2, @Optional() @Inject(SCROLLBAR_CONFIG) private SCROLLBAR_CONFIG: ScrollbarConfig) { }

  /**
   * OnInit lifecycle.
   * @returns {void}
   */
  public ngOnInit(): void {
    this._initConfig();
    this._initDOM();
    this._initListeners();
    this._initScrollbar();
    
    const horizontalTrackbar = this._scrollbar.trackbars.find(t => t.axis === Axis.X);
    const verticalTrackbar = this._scrollbar.trackbars.find(t => t.axis === Axis.Y);

    this._hideNativeScrollbar(horizontalTrackbar.thickness, verticalTrackbar.thickness);
    this._updateBarVisibilityUI(!this.autoHide);

    this._updateThicknessBarUI(horizontalTrackbar.axis, horizontalTrackbar.thickness);
    this._updateBarSizeUI(horizontalTrackbar.axis, horizontalTrackbar.bar);
    this._updateBarPositionUI(horizontalTrackbar.axis, horizontalTrackbar.bar);

    this._updateThicknessBarUI(verticalTrackbar.axis, verticalTrackbar.thickness);
    this._updateBarSizeUI(verticalTrackbar.axis, verticalTrackbar.bar);
    this._updateBarPositionUI(verticalTrackbar.axis, verticalTrackbar.bar);
  }

  /**
   * AfterViewInit lifecycle.
   * @returns {void}
   */
  ngAfterViewInit(): void {
  }

  /**
   * OnChanges lifecycle.
   * @returns {void}
   * @param {SimpleChanges} changes - Changes
   */
  ngOnChanges(changes: SimpleChanges): void {
    //if !autohide => unbind event mouseenter + display scrollbar
    //if autohide => bind event mouseenter
  }

  /**
   * OnDestroy lifecycle.
   * @returns {void}
   */
  ngOnDestroy(): void {
    this._removeAllEventActions();
  }

  /**
   * Init config.
   * @returns {void}
   */
  private _initConfig(): void{
    this._config = DEFAULT_SCROLLBAR_CONFIG;

    if(this.SCROLLBAR_CONFIG){
      Object.assign(this._config, this.SCROLLBAR_CONFIG);
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
   *          // content here
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
   * @returns {void}
   */
  private _initDOM(): void{
    this._containerElement = this._createElement('div', [CLASSNAME.CONTAINER]);
    this._maskElement = this._createElement('div', [CLASSNAME.MASK]);
    this._offsetElement = this._createElement('div', [CLASSNAME.OFFSET]);
    this._contentElement = this._createElement('div', [CLASSNAME.CONTENT]);
    this._horizontalTrackbarElement = this._createElement('div', [CLASSNAME.TRACKBAR, CLASSNAME.HORIZONTAL_TRACKBAR]);
    this._horizontalBarElement = this._createElement('div', [CLASSNAME.BAR]);
    this._verticalTrackbarElement = this._createElement('div', [CLASSNAME.TRACKBAR, CLASSNAME.VERTICAL_TRACKBAR]);
    this._verticalBarElement = this._createElement('div', [CLASSNAME.BAR]);

    if(this._element.nativeElement.childNodes) {
      while(this._element.nativeElement.childNodes.length > 0) {
        this._renderer.appendChild(this._contentElement, this._element.nativeElement.childNodes[0]);
      }
    }

    this._renderer.appendChild(this._offsetElement, this._contentElement);
    this._renderer.appendChild(this._maskElement, this._offsetElement);
    this._renderer.appendChild(this._containerElement, this._maskElement);
    this._renderer.appendChild(this._element.nativeElement, this._containerElement);

    this._renderer.appendChild(this._horizontalTrackbarElement, this._horizontalBarElement);
    this._renderer.appendChild(this._element.nativeElement, this._horizontalTrackbarElement);
    
    this._renderer.appendChild(this._verticalTrackbarElement, this._verticalBarElement);
    this._renderer.appendChild(this._element.nativeElement, this._verticalTrackbarElement);
  }

  /**
   * Init listener to action.
   * @returns {void}
   */
  private _initListeners(): void{

    const eventActions = [
      { element: this._element.nativeElement, 
        events: ['mouseenter'], 
        call: (e) => { this._updateBarVisibilityUI(true); },
        condition: () => { return this.autoHide; } 
      }, 
      { element: this._element.nativeElement, 
        events: ['mouseleave'], 
        call: (e) => { this._updateBarVisibilityUI(false); },
        condition: () => { return this.autoHide; } 
      },
      { element: this._contentElement, 
        events: ['scroll'], 
        call: (e) => { this._onScroll(e) }
      },
      { element: window, 
        events: ['resize'], 
        call: (e) => { this._onWindowResize(e) }
      },
      { element: this._verticalBarElement, 
        events: ['mousedown',
                'touchstart'], 
                call: (e) => { this._onSelectBarStart(Axis.Y, e) }
      },
      { element: this._horizontalBarElement, 
        events: ['mousedown',
                'touchstart'], 
                call: (e) => { this._onSelectBarStart(Axis.X, e) }
      }
    ];
    
    this._attachEventAction(eventActions);
  }

  private _initScrollbar(): void{
    this._scrollbar = new Scrollbar();

    const horizontalTrackbar = new Trackbar();
    horizontalTrackbar.axis = Axis.X;
    horizontalTrackbar.size = (<any>this._element.nativeElement).clientWidth;
    horizontalTrackbar.thickness = this._calcThicknessBar(Axis.X);
    horizontalTrackbar.bar = new Bar();
    horizontalTrackbar.bar.element = this._horizontalBarElement;
    horizontalTrackbar.bar.size = this._calcSizeBar(Axis.X);
    horizontalTrackbar.bar.offset = this._calcPositionBar(Axis.X, horizontalTrackbar.bar.size);
    this._scrollbar.trackbars.push(horizontalTrackbar);

    const verticalTrackbar = new Trackbar();
    verticalTrackbar.axis = Axis.Y;
    verticalTrackbar.size = (<any>this._element.nativeElement).clientHeight;
    verticalTrackbar.thickness = this._calcThicknessBar(Axis.Y);
    verticalTrackbar.bar = new Bar();
    verticalTrackbar.bar.element = this._verticalBarElement;
    verticalTrackbar.bar.size = this._calcSizeBar(Axis.Y);
    verticalTrackbar.bar.offset = this._calcPositionBar(Axis.Y, verticalTrackbar.bar.size);
    this._scrollbar.trackbars.push(verticalTrackbar);
  }

  /**
   * Resize event on window.
   * @param {Event} e - Resize event 
   * @returns {void}
   */
  private _onWindowResize(e: MouseEvent): void {
    this._initScrollbar();

    const horizontalTrackbar = this._scrollbar.trackbars.find(t => t.axis === Axis.X);
    const verticalTrackbar = this._scrollbar.trackbars.find(t => t.axis === Axis.Y);

    this._hideNativeScrollbar(horizontalTrackbar.thickness, verticalTrackbar.thickness);

    this._updateThicknessBarUI(horizontalTrackbar.axis, horizontalTrackbar.thickness);
    this._updateBarSizeUI(horizontalTrackbar.axis, horizontalTrackbar.bar);
    this._updateBarPositionUI(horizontalTrackbar.axis, horizontalTrackbar.bar);

    this._updateThicknessBarUI(verticalTrackbar.axis, verticalTrackbar.thickness);
    this._updateBarSizeUI(verticalTrackbar.axis, verticalTrackbar.bar);
    this._updateBarPositionUI(verticalTrackbar.axis, verticalTrackbar.bar);
  }

   /**
   * Scroll event.
   * @param {Event} e - Scroll event
   * @returns {void}
   */
  private _onScroll(e: MouseEvent): void{
    const horizontalBar = this._scrollbar.trackbars.find(t => t.axis === Axis.X).bar;
    const verticalBar = this._scrollbar.trackbars.find(t => t.axis === Axis.Y).bar;
    horizontalBar.offset = this._calcPositionBar(Axis.X, horizontalBar.size);
    verticalBar.offset = this._calcPositionBar(Axis.Y, verticalBar.size);

    window.requestAnimationFrame(() => { this._updateBarPositionUI(Axis.X, horizontalBar) });
    window.requestAnimationFrame(() => { this._updateBarPositionUI(Axis.Y, verticalBar) });
  }

  /**
   * On drag scrollbar start event.
   * @param {Axis} axis - X for horizontal, Y for vertical
   * @param {MouseEvent} e - Mouse event
   * @returns {void}
   */
  private _onSelectBarStart(axis: Axis, e: MouseEvent): void {
    e.preventDefault();
    e.stopPropagation();

    const trackbar = this._scrollbar.trackbars.find(t => t.axis === axis);
    const bar = trackbar.bar;
    bar.dragging = true;
    bar.pointerOffset = axis === Axis.X ? e.pageX : e.pageY;
    bar.dragOffset = bar.offset;

    const dragEventAction = [
      { element: window, 
        events: ['mousemove'], 
                call: (e) => { this._onSelectBarMove(e, trackbar) }
      },
      { element: window, 
        events: ['mouseup',
                'touchend'], 
                call: (e) => { this._onSelectBarEnd(e) }
      }
    ];

    this._attachEventAction(dragEventAction);
  }

  /**
   * On drag scrollbar move event.
   * @param {MouseEvent} e - Mouse event
   * @param {Trackbar} trackbar - Trackbar
   * @returns {void}
   */
  private _onSelectBarMove(e: MouseEvent, trackbar: Trackbar): void {
    let position = trackbar.axis === Axis.X ? e.pageX : e.pageY;
    let moveOffset = position - trackbar.bar.pointerOffset;
    trackbar.bar.offset = trackbar.bar.dragOffset + moveOffset;
    const scrollTo = this._calcPositionContent(trackbar);
    this._scroll(trackbar.axis, scrollTo);
  }

  /**
   * On drag scrollbar end event.
   * @param {MouseEvent} e - Mouse event
   * @returns {void}
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
   * @param {Axis} axis - X for horizontal, Y for vertical
   * @param {number} thickness - thickness
   * @returns {void}
   */
  private _updateThicknessBarUI(axis: Axis, thickness: number): void{
    if(axis === Axis.X) {
      this._renderer.setStyle(this._horizontalTrackbarElement, 'height', `${thickness}px`);
    } else {
      this._renderer.setStyle(this._verticalTrackbarElement, 'width', `${thickness}px`);
    }
  }

  /**
   * Update bar visibility.
   * @param {boolean} visible - Is visible
   * @returns {void}
   */
  private _updateBarVisibilityUI(visible: boolean): void{
    if(visible){
      this._renderer.addClass(this._verticalBarElement, CLASSNAME.BAR_VISIBLE);
      this._renderer.addClass(this._horizontalBarElement, CLASSNAME.BAR_VISIBLE);
    } else {
      this._renderer.removeClass(this._verticalBarElement, CLASSNAME.BAR_VISIBLE);
      this._renderer.removeClass(this._horizontalBarElement, CLASSNAME.BAR_VISIBLE);
    }
  }

  /**
   * Update bar size.
   * @param {number} axis - X for horizontal, Y for vertical
   * @param {Bar} bar - bar
   * @returns {void}
   */
  private _updateBarSizeUI(axis: Axis, bar: Bar): void {
    if(axis === Axis.X) {
    this._renderer.setStyle(bar.element, 'width', `${bar.size}px`);
    } else {
    this._renderer.setStyle(bar.element, 'height', `${bar.size}px`);
    }
  }

  /**
   * Update bar position.
   * @param {number} axis - X for horizontal, Y for vertical
   * @param {Bar} bar - bar
   * @returns {void}
   */
  private _updateBarPositionUI(axis: Axis, bar: Bar): void {
    if(axis === Axis.X) {
      this._renderer.setStyle(bar.element, 'transform', `translate3d(${bar.offset}px, 0, 0)`);
    } else {
      this._renderer.setStyle(bar.element, 'transform', `translate3d(0, ${bar.offset}px, 0)`);
    }
  }

  /**
   * Scroll.
   * @param {Axis} axis - X for horizontal, Y for vertical
   * @param {number} scrollTo - scrollTo
   * @returns {void}
   */
  private _scroll(axis: Axis, scrollTo: number): void {
    if(axis === Axis.X) {
      (<any>this._contentElement).scrollLeft = scrollTo;
    } else {
      (<any>this._contentElement).scrollTop = scrollTo;
    }
  }

  /**
   * Hide native scrollbar using offset.
   * @param {number} offsetRight - Right offset
   * @param {number} offsetBottom - Bottom offset
   * @returns {void}
   */
  private _hideNativeScrollbar(offsetRight: number, offsetBottom: number): void{
    this._renderer.setStyle(this._offsetElement, 'right', `-${offsetRight}px`);
    this._renderer.setStyle(this._offsetElement, 'bottom', `-${offsetBottom}px`);
  }

  /**
   * Calculate position bar.
   * @param {Axis} axis - X for horizontal, Y for vertical
   * @param {number} sizeBar - size bar
   * @returns { number } Returns offset.
   */
  private _calcPositionBar(axis: Axis, sizeBar: number): number {
    if(axis === Axis.X) {
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
   * @param {Trackbar} trackbar - trackbar
   * @returns { number } Returns content offset.
   */
  private _calcPositionContent(trackbar: Trackbar): number {
    if(trackbar.axis === Axis.X) {
      const contentWidthSize = (<any>this._contentElement).scrollWidth;
      const ratio =  contentWidthSize / trackbar.size;
      return trackbar.bar.offset*ratio;

    } else {
      const contentHeightSize = (<any>this._contentElement).scrollHeight;
      const ratio = contentHeightSize / trackbar.size;
      return trackbar.bar.offset*ratio;
    }
  }

  /**
   * Calculate size bar.
   * @param {Axis} axis - X for horizontal, Y for vertical
   * @returns { number } Returns size.
   */
  private _calcSizeBar(axis: Axis): number {
    const contentSize = axis === Axis.X ? (<any>this._contentElement).scrollWidth : (<any>this._contentElement).scrollHeight;
    const hostSize = axis === Axis.X ? (<any>this._element.nativeElement).clientWidth : (<any>this._element.nativeElement).clientHeight;
    
    if(hostSize > contentSize || contentSize === 0){
      return 0;
    }

    const sizeBar = ~~((hostSize*hostSize) / contentSize);
    
    if(this._config.barMaxSize > 0 && sizeBar > this._config.barMaxSize) {
      return this._config.barMaxSize;
    } else if (this._config.barMinSize > 0 && sizeBar < this._config.barMinSize) {
      return this._config.barMinSize;
    } else {
      return sizeBar;
    }
  }

  /**
   * Calculate thickness bar.
   * @param {Axis} axis - X for horizontal, Y for vertical
   * @returns { number } Returns thickness.
   */
  private _calcThicknessBar(axis: Axis): number {
    const thickness = axis === Axis.X ? this._contentElement['offsetWidth'] - this._contentElement['clientWidth'] : this._contentElement['offsetHeight'] - this._contentElement['clientHeight'];

    if(thickness > this._config.trackbarMaxThickness) {
      return this._config.trackbarMaxThickness;
    } else if (thickness < this._config.trackbarMinThickness) {
      return this._config.trackbarMinThickness;
    } else {
      return thickness;
    }
  }

  /**
   * Create element and set class names.
   * @param {string} element - Current element
   * @param {Array<string>} classnames - list of class name
   * @returns {ElementRef} Returns element created.
   */
  private _createElement(element: string, classnames: Array<string>): ElementRef {
    const result = this._renderer.createElement(element);
    for(const classname of classnames) {
      this._renderer.addClass(result, classname);
    }
    return result;
  }

  /**
   * Attach event to action.
   * @param { Array<EventAction> } eventActions - Events
   * @returns {void}
   */
  private _attachEventAction(eventActions: Array<EventAction>): void {
    for(const eventAction of eventActions) {
      if(eventAction.condition) {
        if((typeof eventAction.condition === 'function' && !eventAction.condition())) {
          continue;
        }
      }

      eventAction.events.forEach((eventName) => {
        if(!this._attachedEventList.some(ae => ae.element === eventAction.element && ae.event === eventName)) {
          const attachedEvent = new AttachedEvent();
          attachedEvent.element = eventAction.element;
          attachedEvent.event = eventName;
          attachedEvent.remove = eventAction.remove;
          attachedEvent.unlisten = this._renderer.listen(eventAction.element, eventName, eventAction.call);
          this._attachedEventList.push(attachedEvent);
        }
      })
    }
  }

  /**
   * Remove event to action.
   * @param {any} element - element
   * @param {string} eventName - event
   * @returns {void}
   */
  private _removeEventAction(element: any, eventName: string): void {
    const attachedEventIndex = this._attachedEventList.findIndex(ae => ae.element === element && ae.event === eventName);

    if(attachedEventIndex >= 0) {
      this._attachedEventList[attachedEventIndex].unlisten();
      if(this._attachedEventList[attachedEventIndex].remove) {
        this._attachedEventList[attachedEventIndex].remove();
      }

      this._attachedEventList.splice(attachedEventIndex, 1);
    }
  }

  /**
   * Remove all event to action.
   * @returns {void}
   */
  private _removeAllEventActions(): void{
    for(const attachedEvent of this._attachedEventList) {
      attachedEvent.unlisten();
      if(attachedEvent.remove) {
        attachedEvent.remove();
      }
    }
  }
}
