
import { InjectionToken } from '@angular/core';

export const SCROLLBAR_CONFIG = new InjectionToken<ScrollbarConfig>('SCROLLBAR_CONFIG');

export const DEFAULT_SCROLLBAR_CONFIG : ScrollbarConfig = {
    autoHide: true,
    trackbarMinThickness: 11,
    trackbarMaxThickness: 20,
    barMinSize: 20
};

export interface ScrollbarConfig {
    autoHide: boolean;
    trackbarMinThickness: number;
    trackbarMaxThickness: number;
    barMinSize: number;
    barMaxSize?: number;
}
