import { Camera } from './camera';
import { canvasHeight, canvasWidth, initialZoom, zoomThreshold } from './data/constants';
import { type StageDef, stages } from './data/maps';
import { GoalBurst } from './goalBurst';
import type { HudFrame, MarbleLabel } from './hud/hudFrame';
import type { IPhysics } from './IPhysics';
import { Marble } from './marble';
import { Box2dPhysics } from './physics-box2d';
import { ProgressMap } from './progressMap';
import { ThreeWorldRenderer } from './render/three/threeWorldRenderer';
import type { VectorLike } from './types/VectorLike';
import { bound } from './utils/bound.decorator';
import { limitMembers, shuffle } from './utils/utils';
import { drawZoomZones, zoomZoneIntensity } from './zoomZone';

/**
 * 순위 흔들림 줄이기. 구슬마다 순위 값(결승까지 남은 거리) 을 이 시간(초) 동안 부드럽게 따라가고,
 * 앞 구슬보다 RANK_MARGIN 넘게 앞서야 자리를 바꾼다
 */
const RANK_EMA_SEC = 0.4;
const RANK_MARGIN = 0.25;
/** 빨리 감기를 켰을 때의 배속 */
const FAST_FORWARD_SPEED = 2;

export class Roulette extends EventTarget {
  private _marbles: Marble[] = [];

  private _lastTime: number = 0;
  private _elapsed: number = 0;

  private _updateInterval = 10;
  private _timeScale = 1;
  private _speed = 1;
  private _fastForward = false;

  private _winners: Marble[] = [];
  private _stage: StageDef | null = null;

  private _camera: Camera = new Camera();
  private _renderer: ThreeWorldRenderer;
  private _frameListeners: ((frame: HudFrame) => void)[] = [];

  private _bursts: GoalBurst[] = [];

  private _goalDist: number = Infinity;
  /** 연출 구역이 있는 맵에서 1등을 다투는 두 구슬 중 센 쪽의 연출 강도 (0 ~ 1). 구역이 없으면 null 이고 zoomY 로 판단한다 */
  private _zoomIntensity: number | null = null;
  /** 연출이 _targetIndex 구슬이 아니라 _rivalIndex 구슬 때문에 걸렸는지 */
  private _focusOnRival = false;
  /** 구슬별 평활화한 순위 값 (결승까지 남은 거리) */
  private _rankKeys = new Map<Marble, number>();
  /** 진행도 지도 그림 (setProgressDebug 로 켰을 때 맵마다 한 번 만든다) */
  private _progressImage: { map: ProgressMap; image: HTMLCanvasElement } | null = null;
  /** 시작해서 모든 순위가 정해질 때까지 true */
  private _isRunning: boolean = false;
  /** 모든 순위가 정해졌는지 */
  private _finished: boolean = false;
  /** 진행 중에는 null, 1등이 확정되면 그 구슬 */
  private _winner: Marble | null = null;

  // 구슬 id(= order)는 매 라운드 재사용된다. 리셋 시 취소하지 않으면 이 타이머가
  // 뒤늦게 발화해 같은 id를 가진 새 라운드의 구슬을 지워버린다
  private _pendingRemovals: number[] = [];

  private physics!: IPhysics;

  /** 물리 엔진을 다 불러와 구슬과 맵을 다룰 수 있게 되면 끝난다 */
  readonly ready: Promise<void>;

  /** WebGL 을 쓸 수 없으면 예외를 던진다 */
  constructor() {
    super();
    this._renderer = new ThreeWorldRenderer();
    this._renderer.attach(document.body);
    this.ready = this._init().then(() => {
      this._update();
    });
  }

  /** 프레임을 그릴 때마다 HUD 가 읽을 상태를 넘긴다. 받은 객체는 그 프레임 동안만 유효하다 */
  public onFrame(listener: (frame: HudFrame) => void) {
    this._frameListeners.push(listener);
  }

  @bound
  private _update() {
    if (!this._lastTime) this._lastTime = Date.now();
    const currentTime = Date.now();

    this._elapsed += (currentTime - this._lastTime) * this._speed * (this._fastForward ? FAST_FORWARD_SPEED : 1);
    if (this._elapsed > 100) {
      this._elapsed %= 100;
    }
    this._lastTime = currentTime;

    // _timeScale 은 _updateMarbles 에서 갱신되지만 물리 스텝 크기는 이 프레임 시작값으로 고정된다.
    // 구슬 정지 판정도 같은 값을 써야 실제 진행된 물리 시간과 맞는다
    const timeScale = this._timeScale;
    const interval = (this._updateInterval / 1000) * timeScale;

    let simSeconds = 0;
    while (this._elapsed >= this._updateInterval) {
      simSeconds += interval;
      this.physics.step(interval);
      this._updateMarbles(this._updateInterval, timeScale);
      this._updateEffects(this._updateInterval);
      this._elapsed -= this._updateInterval;
    }

    if (this._marbles.length > 1) {
      this._sortMarbles(simSeconds);
    }

    if (this._stage) {
      const cameraTargetIndex = this._winners.length > 0 ? this._targetIndex : 0;
      this._camera.update({
        marbles: this._marbles,
        stage: this._stage,
        intensity: this._zoomIntensity ?? Math.max(0, 1 - this._goalDist / zoomThreshold),
        targetIndex: cameraTargetIndex,
        focusOnRival: cameraTargetIndex === this._targetIndex && this._focusOnRival,
        viewSize: { x: this._renderer.viewSize.x / initialZoom, y: this._renderer.viewSize.y / initialZoom },
      });
    }

    this._render();
    window.requestAnimationFrame(this._update);
  }

  /**
   * 순위대로 정렬한다. 순위 값은 진행도 지도의 "결승까지 남은 거리" (progressMap.ts).
   * dt = 이번 프레임에 진행된 물리 시간(초)
   */
  private _sortMarbles(dt: number) {
    if (!this._stage) return;
    const map = ProgressMap.for(this._stage);

    /** 지난 프레임 기록이 있는 구슬 수. 구슬을 새로 넣은 직후면 0 */
    let known = 0;
    const alpha = 1 - Math.exp(-dt / RANK_EMA_SEC);
    const keys = new Map<Marble, number>();
    for (const m of this._marbles) {
      const raw = map.distanceAt(m.x, m.y);
      const prev = this._rankKeys.get(m);
      if (prev !== undefined) known++;
      keys.set(m, prev !== undefined ? prev + (raw - prev) * alpha : raw);
    }
    this._rankKeys = keys;

    // 구슬을 막 넣었을 때는 지난 순서가 없으니 그냥 정렬한다
    if (known < this._marbles.length / 2) {
      this._marbles.sort((a, b) => keys.get(a)! - keys.get(b)! || b.y - a.y);
      return;
    }
    // 지난 프레임 순서에서 출발해, 앞 구슬보다 RANK_MARGIN 넘게 앞설 때만 앞으로 보낸다 (여유를 둔 삽입 정렬).
    // 순서가 거의 그대로라 일반 정렬보다 빠르다
    const list = this._marbles;
    for (let i = 1; i < list.length; i++) {
      const m = list[i];
      const k = keys.get(m)! + RANK_MARGIN;
      let j = i;
      while (j > 0 && k < keys.get(list[j - 1])!) {
        list[j] = list[j - 1];
        j--;
      }
      list[j] = m;
    }
  }

  /** 진행도 지도(순위 계산에 쓰는 남은 거리), 일방통행 선, 연출 구역, 카메라 구역을 맵 위에 그린다 (테스트 플레이에서 확인용) */
  public setProgressDebug(on: boolean) {
    this._renderer.debugDraw = on
      ? (ctx) => {
          if (!this._stage) return;
          const map = ProgressMap.for(this._stage);
          if (this._progressImage?.map !== map) this._progressImage = { map, image: map.toCanvas() };
          map.drawDebug(ctx, this._progressImage.image);
          if (this._stage.zoomZones?.length) drawZoomZones(ctx, this._stage.zoomZones);
          if (this._stage.cameraZones?.length) drawZoomZones(ctx, this._stage.cameraZones, '200, 60, 255');
        }
      : null;
  }

  private _updateMarbles(deltaTime: number, timeScale: number) {
    if (!this._stage) return;

    for (let i = 0; i < this._marbles.length; i++) {
      const marble = this._marbles[i];
      marble.update(deltaTime, timeScale);
      if (marble.y > this._stage.goalY) {
        this._winners.push(marble);
        if (this._isRunning && this._winners.length === 1) {
          this._bursts.push(new GoalBurst(marble.x, marble.y, marble.hue));
        }
        this._pendingRemovals.push(
          window.setTimeout(() => {
            this.physics.removeMarble(marble.id);
          }, 500)
        );
      }
    }

    // 연출(줌인, 슬로모션) 은 1등을 다투는 두 구슬 중 연출이 더 센 쪽을 기준으로 건다.
    // 1등이 골인한 뒤에는 대상 구슬이 없어 연출 강도가 0 이 되고, 카메라는 남은 선두를 따라가기만 한다
    const stage = this._stage;
    const zones = stage.zoomZones?.length ? stage.zoomZones : null;
    const intensityOf = (m: Marble) =>
      zones ? zoomZoneIntensity(zones, m.x, m.y) : Math.max(0, 1 - Math.abs(stage.zoomY - m.y) / zoomThreshold);
    const target = this._marbles[this._targetIndex];
    const rival = this._marbles[this._rivalIndex];
    this._focusOnRival = !!target && !!rival && intensityOf(rival) > intensityOf(target);
    const focus = this._focusOnRival ? rival : target;
    this._goalDist = Math.abs(stage.zoomY - (focus ? focus.y : 0));
    this._zoomIntensity = zones ? (focus ? intensityOf(focus) : 0) : null;
    this._timeScale = this._calcTimeScale();

    this._marbles = this._marbles.filter((marble) => marble.y <= stage.goalY);

    this._checkFinish();
  }

  /** 카메라와 슬로우모션이 주목할 구슬 = 1등 후보. 1등이 골인한 뒤에는 음수라 가리키는 구슬이 없다 */
  private get _targetIndex() {
    return -this._winners.length;
  }

  /** 1등을 두고 _targetIndex 구슬과 다투는 구슬 = 바로 뒤, 없으면 바로 앞 구슬 */
  private get _rivalIndex() {
    const i = this._targetIndex;
    return this._marbles[i + 1] ? i + 1 : i - 1;
  }

  /** 1등이 정해지면 'winner', 모든 순위가 정해지면 'finish' 이벤트를 낸다. 1등이 나와도 게임은 계속된다 */
  private _checkFinish() {
    if (!this._isRunning) return;

    if (!this._winner && this._winners.length > 0) {
      this._winner = this._winners[0];
      this.dispatchEvent(new CustomEvent('winner', { detail: { winner: this._winner.name } }));
    }

    // 남은 구슬이 하나면 그 구슬의 순위는 골인하지 않아도 정해진다
    const lastOneLeft = this._marbles.length === 1 && this._winners.length > 0;
    if (this._marbles.length === 0 || lastOneLeft) {
      this._isRunning = false;
      this._finished = true;
      this.dispatchEvent(new CustomEvent('finish'));
    }
  }

  private _calcTimeScale(): number {
    if (!this._stage) return 1;
    const targetIndex = this._targetIndex;
    // 연출 구역: 1등 후보 구슬이 구역 가운데로 갈수록 느려진다. 경쟁하는 구슬이 있을 때만
    if (this._zoomIntensity !== null) {
      if (
        this._winners.length === 0 &&
        this._zoomIntensity > 0 &&
        (this._marbles[targetIndex - 1] || this._marbles[targetIndex + 1])
      ) {
        return Math.max(0.2, 1 - this._zoomIntensity);
      }
      return 1;
    }
    if (this._winners.length === 0 && this._goalDist < zoomThreshold) {
      if (
        this._marbles[this._focusOnRival ? this._rivalIndex : targetIndex].y >
          this._stage.zoomY - zoomThreshold * 1.2 &&
        (this._marbles[targetIndex - 1] || this._marbles[targetIndex + 1])
      ) {
        return Math.max(0.2, this._goalDist / zoomThreshold);
      }
    }
    return 1;
  }

  private _updateEffects(deltaTime: number) {
    this._bursts.forEach((burst) => burst.update(deltaTime));
    this._bursts = this._bursts.filter((burst) => !burst.isDestroy);
  }

  private _render() {
    if (!this._stage) return;
    const entities = this.physics.getEntities();
    this._renderer.render({
      camera: this._camera,
      stage: this._stage,
      entities,
      marbles: this._marbles,
      bursts: this._bursts,
    });
    if (this._frameListeners.length === 0) return;

    const labels: MarbleLabel[] = [];
    for (const marble of this._marbles) {
      const screen = this._renderer.projectMarble(marble);
      if (screen) labels.push({ marble, ...screen });
    }
    const frame: HudFrame = {
      stage: this._stage,
      entities,
      marbles: this._marbles,
      winners: this._winners,
      winner: this._winner,
      finished: this._finished,
      camera: this._camera,
      viewSize: this._renderer.viewSize,
      labels,
    };
    for (const listener of this._frameListeners) listener(frame);
  }

  private async _init() {
    this.physics = new Box2dPhysics();
    await this.physics.init();
    this._stage = stages[0];
    this._loadMap();
  }

  /** 누르고 있는 동안처럼 잠깐 빠르게 돌린다 */
  public setFastForward(on: boolean) {
    this._fastForward = on;
  }

  /** 카메라를 pos 로 옮기고 구슬을 따라가지 않게 한다. null 이면 다시 따라간다 (미니맵에서 맵을 훑어볼 때) */
  public lookAt(pos: VectorLike | null) {
    if (pos) {
      this._camera.setPosition(pos, false);
      this._camera.lock(true);
    } else {
      this._camera.lock(false);
    }
  }

  private _loadMap() {
    if (!this._stage) {
      throw new Error('No map has been selected');
    }

    this.physics.createStage(this._stage);
    this._camera.initializePosition();
  }

  public clearMarbles() {
    this._pendingRemovals.forEach((id) => window.clearTimeout(id));
    this._pendingRemovals = [];
    this.physics.clearMarbles();
    this._winner = null;
    this._winners = [];
    this._marbles = [];
  }

  public start() {
    this._isRunning = true;
    this._camera.startFollowingMarbles();
    this.physics.start();
    this._marbles.forEach((marble) => (marble.isActive = true));
  }

  public setSpeed(value: number) {
    if (value <= 0) {
      throw new Error('Speed multiplier must larger than 0');
    }
    this._speed = value;
  }

  /**
   * 구슬을 새로 채운다. 총 구슬 수가 상한(MAX_MARBLES) 을 넘게 만드는 항목은 받지 않는다.
   * @returns 받지 않은 항목
   */
  public setMarbles(names: string[]): string[] {
    this.reset();
    const { members, rejected } = limitMembers(names);
    const totalCount = members.reduce((sum, member) => sum + member.count, 0);

    const orders = shuffle(
      Array(totalCount)
        .fill(0)
        .map((_, i) => i)
    );
    members.forEach((member) => {
      for (let j = 0; j < member.count; j++) {
        const order = orders.pop() || 0;
        this._marbles.push(new Marble(this.physics, order, totalCount, member.name));
      }
    });

    // 카메라를 구슬 생성 위치 중앙으로 이동 + 줌인
    if (totalCount > 0) {
      const cols = Math.min(totalCount, 10);
      const rows = Math.ceil(totalCount / 10);
      const lineDelta = -Math.max(0, Math.ceil(rows - 5));
      const centerX = 10.25 + (cols - 1) * 0.3;
      const centerY = (1 + rows) / 2 + lineDelta;

      const spawnWidth = Math.max((cols - 1) * 0.6, 1);
      const spawnHeight = Math.max(rows - 1, 1);
      const margin = 3;
      const viewW = canvasWidth / initialZoom;
      const viewH = canvasHeight / initialZoom;
      const zoom = Math.max(
        1.5,
        Math.min(Math.min(viewW / (spawnWidth + margin * 2), viewH / (spawnHeight + margin * 2)), 3)
      );

      this._camera.initializePosition({ x: centerX, y: centerY }, zoom);
    }
    return rejected;
  }

  private _clearMap() {
    this.physics.clear();
    this._marbles = [];
  }

  public reset() {
    this.clearMarbles();
    this._clearMap();
    this._loadMap();
    this._goalDist = Infinity;
    this._focusOnRival = false;
    this._zoomIntensity = null;
    this._timeScale = 1;
    this._isRunning = false;
    this._finished = false;
    this._bursts = [];
    this._rankKeys.clear();
  }

  /** 맵을 바꾼다. 구슬은 비워지므로 setMarbles 로 다시 채운다 */
  public setMap(index: number) {
    if (index < 0 || index > stages.length - 1) {
      throw new Error('Incorrect map number');
    }
    this._stage = stages[index];
    this.reset();
  }
}
