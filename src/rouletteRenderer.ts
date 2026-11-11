import type { Camera } from './camera';
import { canvasHeight, canvasWidth, theme, winnerAreaHeight } from './data/constants';
import type { StageDef } from './data/maps';
import type { GoalBurst } from './goalBurst';
import type { Marble } from './marble';
import { ThreeWorldRenderer } from './render/three/threeWorldRenderer';
import type { WorldDebugDraw, WorldFrame, WorldRenderer } from './render/worldRenderer';
import type { MapEntityState } from './types/MapEntity.type';
import type { VectorLike } from './types/VectorLike';
import type { UIObject } from './UIObject';

export type RenderParameters = {
  camera: Camera;
  stage: StageDef;
  entities: MapEntityState[];
  marbles: Marble[];
  winners: Marble[];
  bursts: GoalBurst[];
  /** 진행 중에는 null, 1등이 확정되면 그 구슬 */
  winner: Marble | null;
  size: VectorLike;
};

const MAX_DISPLAY_WIDTH = 1920;
const WINNER_TEXT_OFFSET = 30;

export class RouletteRenderer {
  protected _canvas!: HTMLCanvasElement;
  protected _sceneCanvas!: HTMLCanvasElement;
  protected ctx!: CanvasRenderingContext2D;
  private _displayCtx!: CanvasRenderingContext2D;
  public sizeFactor = 1;

  private _world: WorldRenderer;

  /** WebGL 을 쓸 수 없으면 예외를 던진다 */
  constructor() {
    this._world = new ThreeWorldRenderer();
  }

  get width() {
    return this._sceneCanvas.width;
  }

  get height() {
    return this._sceneCanvas.height;
  }

  get canvas() {
    return this._canvas;
  }

  /** 장애물 아래에 월드 좌표로 덧그리는 그림 (테스트 플레이의 진행도 지도) */
  set debugDraw(draw: WorldDebugDraw | null) {
    this._world.debugDraw = draw;
  }

  async init() {
    this._canvas = document.createElement('canvas');
    this._canvas.width = canvasWidth;
    this._canvas.height = canvasHeight;
    this._displayCtx = this._canvas.getContext('2d', {
      alpha: false,
    }) as CanvasRenderingContext2D;

    this._sceneCanvas = document.createElement('canvas');
    this._sceneCanvas.width = canvasWidth;
    this._sceneCanvas.height = canvasHeight;
    // 월드는 표시용 캔버스에 직접 그리고, 장면 캔버스는 HUD 만 담은 투명한 층이다
    this.ctx = this._sceneCanvas.getContext('2d') as CanvasRenderingContext2D;

    document.body.appendChild(this._canvas);

    const resizing = (entries?: ResizeObserverEntry[]) => {
      const realSize = entries ? entries[0].contentRect : this._canvas.getBoundingClientRect();
      if (realSize.width <= 0 || realSize.height <= 0) return;

      const width = Math.max(realSize.width / 2, 640);
      const height = (width / realSize.width) * realSize.height;
      this._sceneCanvas.width = width;
      this._sceneCanvas.height = height;
      this.sizeFactor = width / realSize.width;

      const displayWidth = Math.min(realSize.width, MAX_DISPLAY_WIDTH);
      this._canvas.width = displayWidth;
      this._canvas.height = (displayWidth / realSize.width) * realSize.height;
    };

    const resizeObserver = new ResizeObserver(resizing);

    resizeObserver.observe(this._canvas);
    resizing();
  }

  render(renderParameters: RenderParameters, uiObjects: UIObject[]) {
    const frame: WorldFrame = {
      camera: renderParameters.camera,
      stage: renderParameters.stage,
      entities: renderParameters.entities,
      marbles: renderParameters.marbles,
      bursts: renderParameters.bursts,
      viewSize: { x: this._sceneCanvas.width, y: this._sceneCanvas.height },
      winningIndex: -renderParameters.winners.length,
    };
    this._world.render(this._displayCtx, frame);
    this.ctx.clearRect(0, 0, this._sceneCanvas.width, this._sceneCanvas.height);

    uiObjects.forEach((obj) =>
      obj.render(this.ctx, renderParameters, this._sceneCanvas.width, this._sceneCanvas.height)
    );
    if (renderParameters.winner) this.renderWinner(renderParameters.winner);

    this._displayCtx.drawImage(this._sceneCanvas, 0, 0, this._canvas.width, this._canvas.height);
  }

  private renderWinner(winner: Marble) {
    this.ctx.save();
    this.ctx.fillStyle = theme.winnerBackground;
    this.ctx.fillRect(
      this._sceneCanvas.width / 2,
      this._sceneCanvas.height - winnerAreaHeight,
      this._sceneCanvas.width / 2,
      winnerAreaHeight
    );

    const marbleSize = 100;
    const marbleCenterX = this._sceneCanvas.width - marbleSize / 2 - 20;
    const marbleCenterY = this._sceneCanvas.height - winnerAreaHeight / 2;
    this.ctx.beginPath();
    this.ctx.arc(marbleCenterX, marbleCenterY, marbleSize / 2, 0, Math.PI * 2);
    this.ctx.fillStyle = `hsl(${winner.hue} 100% ${theme.marbleLightness}%)`;
    this.ctx.fill();

    this.ctx.fillStyle = theme.winnerText;
    this.ctx.strokeStyle = theme.winnerOutline;

    this.ctx.font = 'bold 48px sans-serif';
    this.ctx.textAlign = 'right';
    this.ctx.lineWidth = 4;
    const textRightX = marbleCenterX - marbleSize / 2 - 20;
    if (theme.winnerOutline) {
      this.ctx.strokeText('Winner', textRightX, this._sceneCanvas.height - 120 + WINNER_TEXT_OFFSET);
    }

    this.ctx.fillText('Winner', textRightX, this._sceneCanvas.height - 120 + WINNER_TEXT_OFFSET);
    this.ctx.font = 'bold 72px sans-serif';
    this.ctx.fillStyle = `hsl(${winner.hue} 100% ${theme.marbleLightness}%)`;
    if (theme.winnerOutline) {
      this.ctx.strokeText(winner.name, textRightX, this._sceneCanvas.height - 55 + WINNER_TEXT_OFFSET);
    }
    this.ctx.fillText(winner.name, textRightX, this._sceneCanvas.height - 55 + WINNER_TEXT_OFFSET);
    this.ctx.restore();
  }
}
