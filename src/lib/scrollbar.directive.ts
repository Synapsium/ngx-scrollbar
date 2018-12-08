import { Directive, ElementRef, OnInit, AfterViewInit, OnDestroy, OnChanges, Renderer2, SimpleChanges, Input } from '@angular/core';
import { CLASSNAME } from './constants/classname';
import { EventListenerAction} from './models/event-listener-action';
import { NativeScrollbar } from './models/native-scrollbar';

@Directive({
  selector: '[scrollbar]'
})
export class ScrollbarDirective implements OnInit, AfterViewInit, OnDestroy, OnChanges{
  @Input() autoHide:boolean;

  private _containerElement: ElementRef;
  private _maskElement: ElementRef;
  private _offsetElement: ElementRef;
  private _contentElement: ElementRef;
  private _horizontalTrackbarElement: ElementRef;
  private _horizontalBarElement: ElementRef;
  private _verticalTrackbarElement: ElementRef;
  private _verticalBarElement: ElementRef;
  private _eventListenerActionList: Array<EventListenerAction> = [];
  private _unlistenEventListenerList: { [eventName: string]: () => void } = {};

  /**
   * Represents scrollbar constructor.
   * @constructor
   * @param {ElementRef} element - Current element
   * @param {Renderer2} renderer - Renderer service
   */
  constructor(private _element: ElementRef, private _renderer: Renderer2) { }

  /**
   * OnInit lifecycle.
   * @returns {void}
   */
  public ngOnInit(): void {
    this._initDOM();
    this._initListeners();

    const nativeScrollbar = this._getNativeScrollbar();
    this._updateTrackbarThickness(nativeScrollbar.verticalThickness, nativeScrollbar.horizontalThickness);
    this._hideNativeScrollbar(nativeScrollbar.verticalThickness, nativeScrollbar.horizontalThickness);

    // Set margin to hide native scrollbar

    // update size bar

    // update position bar
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
    this._unbindEventListenerToAction();
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
    this._eventListenerActionList = [
      { element: this._element.nativeElement, 
        events: ['mouseenter'], 
        action: this._log,
        condition: () => { return this.autoHide; } 
      }, 
      { element: this._element.nativeElement, 
        events: ['mousemove'], 
        action: this._log
      },
      { element: this._element.nativeElement, 
        events: ['mouseleave'], 
        action: this._log
      },
      { element: this._contentElement, 
        events: ['scroll'], 
        action: this._log
      },
      { element: window, 
        events: ['resize'], 
        action: (e) => { this._onWindowResize(e) }
      },
      { element: this._element.nativeElement, 
        events: ['mousedown',
                'click',
                'dblclick',
                'touchstart',
                'touchend',
                'touchmove'], 
        action: this._log
      },
      
    ];
    
    this._bindEventListenerToAction();
  }

  /**
   * Resize event on window.
   * @param {Event} e - Event resize
   * @returns {void}
   */
  private _onWindowResize(e: Event): void{
    const nativeScrollbar = this._getNativeScrollbar();
    this._updateTrackbarThickness(nativeScrollbar.verticalThickness, nativeScrollbar.horizontalThickness);
    this._hideNativeScrollbar(nativeScrollbar.verticalThickness, nativeScrollbar.horizontalThickness);
  }

  /**
   * Update trackbar thickness.
   * Trackbar thickness reduces when zoom in
   * and increases with zoom out
   * @param {number} verticalThickness - Vertical native scrollbar thickness
   * @param {number} horizontalThickness - Horizontal native scrollbar thickness
   * @returns {void}
   */
  private _updateTrackbarThickness(verticalThickness: number, horizontalThickness: number): void{
    this._renderer.setStyle(this._verticalTrackbarElement, 'width', `${verticalThickness}px`);
    this._renderer.setStyle(this._horizontalTrackbarElement, 'height', `${horizontalThickness}px`);
    
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
   * Get native scrollbar.
   * @returns { NativeScrollbar } Returns native scrollbar.
   */
  private _getNativeScrollbar() : NativeScrollbar {
    const result = new NativeScrollbar();
    result.verticalThickness = this._contentElement['offsetWidth'] - this._contentElement['clientWidth'];
    result.horizontalThickness = this._contentElement['offsetHeight'] - this._contentElement['clientHeight'];
    return result;
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
   * Bind event to action.
   * @param {string} [eventName] - Event name
   * @returns {void}
   */
  private _bindEventListenerToAction(eventName?: string): void {
    if(!this._eventListenerActionList) {
      return;
    }

    if(eventName) {
      if(this._unlistenEventListenerList[eventName]){
        return;
      }

      const eventListenerAction = this._eventListenerActionList.find(ea => ea.events.some(e => e === eventName));
      if(eventListenerAction) {
        this._unlistenEventListenerList[eventName] = this._renderer.listen(eventListenerAction.element, eventName, eventListenerAction.action);
      }
    } else {
      for(const eventListenerAction of this._eventListenerActionList) {
        if(eventListenerAction.condition) {
          if((typeof eventListenerAction.condition === 'function' && !eventListenerAction.condition())) {
            continue;
          }
        }

        eventListenerAction.events.forEach((eventName) => {
          if(!this._unlistenEventListenerList[eventName]) {
            this._unlistenEventListenerList[eventName] = this._renderer.listen(eventListenerAction.element, eventName, eventListenerAction.action);
          }
        })
      }
    }
  }

  /**
   * Unbind event to action.
   * @param {string} [eventName] - Event name
   * @returns {void}
   */
  private _unbindEventListenerToAction(eventName?: string): void{
    if(!this._unlistenEventListenerList) {
      return;
    }

    if(eventName) {
      if(!this._unlistenEventListenerList[eventName]){
        return;
      }

      this._unlistenEventListenerList[eventName]();
    } else {
      for(const key in this._unlistenEventListenerList) {
        this._unlistenEventListenerList[key]();
      }
    }
  }







  private _log(text: any){
    console.log(text);
  }
}
