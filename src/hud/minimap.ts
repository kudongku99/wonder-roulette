import { theme } from '../data/constants';
import type { StageDef } from '../data/maps';
import { drawShapes, stageRangeX } from '../render/stage2d';
import type { VectorLike } from '../types/VectorLike';
import { el } from '../utils/dom';
import type { HudFrame } from './hudFrame';

/** 미니맵 최대 배율 (월드 1 단위가 CSS 픽셀 몇 개인지). 맵이 길거나 넓으면 이보다 작아진다 */
const MINIMAP_SCALE = 4;
/** 미니맵의 최대 너비 (CSS 픽셀). 기본 가로 범위(26 단위) 가 최대 배율로 들어가는 크기다 */
const MINIMAP_WIDTH = 26 * MINIMAP_SCALE;
/** 미니맵 위아래로 남기는 화면 여백 (CSS 픽셀) */
const VERTICAL_MARGIN = 32;

/**
 * 미니맵. 틀은 HTML 이고 안의 맵·구슬·화면 범위는 작은 캔버스에 그린다.
 * 마우스를 올리면 그 위치를 onLook 으로 알리고, 벗어나면 null 을 알린다.
 */
export class Minimap {
  readonly node = el('section', 'hud-panel minimap');
  private _canvas = el('canvas', 'minimap-canvas');
  private _ctx = this._canvas.getContext('2d') as CanvasRenderingContext2D;
  private _scale = MINIMAP_SCALE;
  /** 지금 맵의 가로 범위. 맵이 바뀔 때만 다시 계산한다 */
  private _rangeStage: StageDef | null = null;
  private _range = { minX: 0, maxX: 26 };

  constructor(onLook: (pos: VectorLike | null) => void) {
    this.node.append(this._canvas);
    this._canvas.addEventListener('pointermove', (e) => {
      onLook({ x: e.offsetX / this._scale + this._range.minX, y: e.offsetY / this._scale });
    });
    this._canvas.addEventListener('pointerleave', () => onLook(null));
  }

  /** @param viewportHeight HUD 영역의 높이 (CSS 픽셀). 맵 전체가 이 안에 들어오게 배율을 줄인다 */
  update(frame: HudFrame, viewportHeight: number) {
    const { stage } = frame;
    if (stage !== this._rangeStage) {
      this._rangeStage = stage;
      this._range = stageRangeX(stage);
    }
    const units = this._range.maxX - this._range.minX;
    const maxHeight = Math.max(0, viewportHeight - VERTICAL_MARGIN * 2);
    this._scale = Math.min(MINIMAP_SCALE, maxHeight / stage.goalY, MINIMAP_WIDTH / units);
    this.resize(units * this._scale, stage.goalY * this._scale);

    const ctx = this._ctx;
    const ratio = this._canvas.width / Math.max(1, this._canvas.clientWidth);
    ctx.setTransform(ratio * this._scale, 0, 0, ratio * this._scale, -this._range.minX * ratio * this._scale, 0);
    ctx.fillStyle = theme.minimapBackground;
    ctx.fillRect(this._range.minX, 0, units, stage.goalY);
    ctx.lineWidth = 0.1;
    drawShapes(ctx, frame.entities);
    this.drawMarbles(frame);
    this.drawViewport(frame);
  }

  private resize(width: number, height: number) {
    const canvas = this._canvas;
    const ratio = window.devicePixelRatio || 1;
    const pixelWidth = Math.round(width * ratio);
    const pixelHeight = Math.round(height * ratio);
    if (canvas.width === pixelWidth && canvas.height === pixelHeight) return;
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  }

  private drawMarbles({ marbles }: HudFrame) {
    const ctx = this._ctx;
    for (const marble of marbles) {
      ctx.fillStyle = marble.color;
      ctx.beginPath();
      ctx.arc(marble.x, marble.y, marble.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawViewport({ viewQuad }: HudFrame) {
    if (viewQuad.length === 0) return;
    const ctx = this._ctx;
    ctx.strokeStyle = theme.minimapViewport;
    ctx.lineWidth = 1 / this._scale;
    ctx.beginPath();
    for (const [x, y] of viewQuad) ctx.lineTo(x, y);
    ctx.closePath();
    ctx.stroke();
  }
}
