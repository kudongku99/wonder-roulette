import type { ColorTheme } from '../types/ColorTheme';

export const initialZoom = 30;
export const canvasWidth = 1600;
export const canvasHeight = 900;
export const zoomThreshold = 5;
export const STUCK_DELAY = 5000;

/** 화면 색. 다크 테마 하나뿐이다 */
export const theme: ColorTheme = {
  background: 'black',
  marbleLightness: 75,
  entity: {
    box: { fill: 'cyan', outline: 'cyan' },
    circle: { fill: 'yellow', outline: 'yellow' },
    polyline: { fill: 'white', outline: 'white' },
  },
  minimapBackground: '#333333',
  minimapViewport: 'white',
};
