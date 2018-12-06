import { Directive, ElementRef, OnInit, Renderer2, Input } from '@angular/core';
import { CLASSNAME } from './constants/classname';

@Directive({
  selector: '[scrollbar]'
})
export class ScrollbarDirective implements OnInit{
  
  @Input() autoHide:boolean;

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
  constructor(private _element: ElementRef, private _renderer: Renderer2) { }

  /**
   * OnInit lifecycle
   */
  public ngOnInit(): void {
    this._initDOM();
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
   */
  private _initDOM(){
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
   * Create element and set class names.
   * @returns {ElementRef} Returns element created.
   */
  private _createElement(element:string, classnames: Array<string>): ElementRef {
    const result = this._renderer.createElement(element);
    for(const classname of classnames) {
      this._renderer.addClass(result, classname);
    }
    return result;
  }

  /**
   * Get native scrollbar width.
   * @returns {number} Returns width of native scrollbar.
   */
  private _getScrollbarWidth() : number{
    return this._contentElement.nativeElement.offsetWidth - this._contentElement.nativeElement.clientWidth;
  }
}
