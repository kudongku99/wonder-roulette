interface ShapeColor {
  outline: string;
  fill: string;
}

export interface ColorTheme {
  background: string;
  marbleLightness: number;
  entity: {
    box: ShapeColor;
    circle: ShapeColor;
    polyline: ShapeColor;
  };
  minimapBackground: string;
  minimapViewport: string;
}
