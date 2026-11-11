import { theme } from '../data/constants';
import type { StageDef } from '../data/maps';
import type { EntityShape } from '../types/MapEntity.type';

/** 기본으로 보여주는 가로 범위. 장애물이 이 밖에 있으면 그만큼 넓혀 보여준다 */
const DEFAULT_MIN_X = 0;
const DEFAULT_UNITS = 26;

export type PlacedShape = { x: number; y: number; angle: number; shape: EntityShape };

/** 맵의 가로 범위. 기본 범위(0 ~ 26) 와 장애물이 있는 범위를 합친다 */
export function stageRangeX(stage: StageDef): { minX: number; maxX: number } {
  let minX = DEFAULT_MIN_X;
  let maxX = DEFAULT_MIN_X + DEFAULT_UNITS;
  for (const entity of stage.entities ?? []) {
    const { x } = entity.position;
    const shape = entity.shape;
    let xs: number[];
    if (shape.type === 'polyline') {
      xs = shape.points.map((p) => x + p[0]);
    } else if (shape.type === 'circle') {
      xs = [x - shape.radius, x + shape.radius];
    } else {
      // 도는 박스는 어느 각도로든 올 수 있으니 대각선 길이만큼, 고정된 박스는 놓인 각도에서 차지하는 만큼
      const reach =
        entity.type === 'kinematic'
          ? Math.hypot(shape.width, shape.height)
          : Math.abs(shape.width * Math.cos(shape.rotation)) + Math.abs(shape.height * Math.sin(shape.rotation));
      xs = [x - reach, x + reach];
    }
    for (const v of xs) {
      if (!Number.isFinite(v)) continue;
      minX = Math.min(minX, v);
      maxX = Math.max(maxX, v);
    }
  }
  return { minX: Math.floor(minX), maxX: Math.ceil(maxX) };
}

/** 맵 데이터의 장애물을 처음 놓인 자리 그대로 */
export function stageShapes(stage: StageDef): PlacedShape[] {
  return (stage.entities ?? []).map((entity) => ({
    x: entity.position.x,
    y: entity.position.y,
    angle: 0,
    shape: entity.shape,
  }));
}

/** 장애물을 월드 좌표로 그린다. ctx 에는 월드 좌표를 화면으로 옮기는 변환이 걸려 있어야 한다 */
export function drawShapes(ctx: CanvasRenderingContext2D, shapes: PlacedShape[]) {
  for (const { x, y, angle, shape } of shapes) {
    ctx.save();
    ctx.fillStyle = shape.color ?? theme.entity[shape.type].fill;
    ctx.strokeStyle = shape.color ?? theme.entity[shape.type].outline;
    ctx.translate(x, y);
    ctx.rotate(angle);
    switch (shape.type) {
      case 'box':
        ctx.rotate(shape.rotation);
        ctx.fillRect(-shape.width, -shape.height, shape.width * 2, shape.height * 2);
        break;
      case 'circle':
        ctx.beginPath();
        ctx.arc(0, 0, shape.radius, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case 'polyline':
        if (shape.points.length > 0) {
          ctx.beginPath();
          ctx.moveTo(shape.points[0][0], shape.points[0][1]);
          for (let i = 1; i < shape.points.length; i++) ctx.lineTo(shape.points[i][0], shape.points[i][1]);
          ctx.stroke();
        }
        break;
    }
    ctx.restore();
  }
}
