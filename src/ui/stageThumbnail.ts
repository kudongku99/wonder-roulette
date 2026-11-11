import { theme } from '../data/constants';
import type { StageDef } from '../data/maps';
import { drawShapes, stageRangeX, stageShapes } from '../render/stage2d';

/** 썸네일의 크기 (CSS 픽셀). 맵이 세로로 길어 세로형이다 */
export const THUMBNAIL_WIDTH = 200;
export const THUMBNAIL_HEIGHT = 440;
const PADDING = 10;

/** 맵 데이터로 맵 전체가 들어오는 그림을 그린 캔버스를 만든다 */
export function createStageThumbnail(stage: StageDef): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = THUMBNAIL_WIDTH * ratio;
  canvas.height = THUMBNAIL_HEIGHT * ratio;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

  const { minX, maxX } = stageRangeX(stage);
  const scale = Math.min(
    (THUMBNAIL_WIDTH - PADDING * 2) / (maxX - minX),
    (THUMBNAIL_HEIGHT - PADDING * 2) / stage.goalY
  );
  ctx.scale(ratio, ratio);
  ctx.fillStyle = theme.minimapBackground;
  ctx.fillRect(0, 0, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);
  ctx.translate(
    (THUMBNAIL_WIDTH - (maxX - minX) * scale) / 2 - minX * scale,
    (THUMBNAIL_HEIGHT - stage.goalY * scale) / 2
  );
  ctx.scale(scale, scale);
  // 맵이 길어 배율이 작아져도 선이 사라지지 않게 화면에서 1픽셀은 되게 한다
  ctx.lineWidth = Math.max(0.1, 1 / scale);
  drawShapes(ctx, stageShapes(stage));
  return canvas;
}
