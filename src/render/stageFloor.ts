import type { StageDef } from '../data/maps';
import { ProgressMap } from '../progressMap';

/** 구슬이 출발하는 자리 (Marble 이 놓는 맨 아랫줄). 맵 안쪽을 찾는 출발점이다 */
const SPAWN_SEEDS: [number, number][] = Array.from({ length: 10 }, (_, k) => [10.25 + k * 0.6, 1]);

export type FloorColors = {
  /** 구슬이 다니는 곳 */
  inside: string;
  /** 맵 바깥 */
  outside: string;
  /** 안쪽에 1 단위마다 긋는 격자. 없으면 긋지 않는다 */
  grid?: string;
};

const masks = new WeakMap<StageDef, HTMLCanvasElement>();

/** 맵 안쪽을 흰색, 바깥을 투명으로 칠한 그림. 진행도 지도 한 칸이 한 픽셀이다. 맵마다 한 번만 만든다 */
function maskImage(stage: StageDef): HTMLCanvasElement {
  let canvas = masks.get(stage);
  if (canvas) return canvas;
  const map = ProgressMap.for(stage);
  const mask = map.reachableFrom(SPAWN_SEEDS);
  canvas = document.createElement('canvas');
  canvas.width = map.cols;
  canvas.height = map.rows;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  const image = ctx.createImageData(map.cols, map.rows);
  for (let i = 0; i < mask.length; i++) {
    if (mask[i]) image.data.set([255, 255, 255, 255], i * 4);
  }
  ctx.putImageData(image, 0, 0);
  masks.set(stage, canvas);
  return canvas;
}

/** 바닥 그림이 덮는 월드 범위 (x, y 는 왼쪽 위). 이 밖은 맵 바깥이다 */
export function floorBounds(stage: StageDef) {
  return ProgressMap.for(stage).bounds;
}

/**
 * 맵 바닥 그림. 구슬이 다니는 안쪽과 바깥을 다른 색으로 칠한다. 칸 경계는 확대할 때 보간돼 부드러워진다.
 * @param pixelsPerUnit 월드 1 단위를 몇 픽셀로 그릴지
 * @returns floorBounds(stage) 범위를 채우는 캔버스
 */
export function paintFloor(stage: StageDef, colors: FloorColors, pixelsPerUnit: number): HTMLCanvasElement {
  const bounds = floorBounds(stage);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(bounds.w * pixelsPerUnit));
  canvas.height = Math.max(1, Math.ceil(bounds.h * pixelsPerUnit));
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(maskImage(stage), 0, 0, canvas.width, canvas.height);

  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = colors.inside;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (colors.grid) {
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = Math.max(1, pixelsPerUnit * 0.04);
    ctx.beginPath();
    for (let x = Math.ceil(bounds.x); x < bounds.x + bounds.w; x++) {
      const px = (x - bounds.x) * pixelsPerUnit;
      ctx.moveTo(px, 0);
      ctx.lineTo(px, canvas.height);
    }
    for (let y = Math.ceil(bounds.y); y < bounds.y + bounds.h; y++) {
      const py = (y - bounds.y) * pixelsPerUnit;
      ctx.moveTo(0, py);
      ctx.lineTo(canvas.width, py);
    }
    ctx.stroke();
  }

  ctx.globalCompositeOperation = 'destination-over';
  ctx.fillStyle = colors.outside;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
}
