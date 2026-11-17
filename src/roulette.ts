import { Camera } from './camera';
import type { CameraView } from './cameraView';
import { canvasHeight, canvasWidth, initialZoom, zoomThreshold } from './data/constants';
import { type StageDef, stages } from './data/maps';
import { GoalBurst } from './goalBurst';
import type { HudFrame, MarbleLabel } from './hud/hudFrame';
import type { IPhysics } from './IPhysics';
import { LobbyBox, type LobbyEntry } from './lobbyBox';
import { Marble } from './marble';
import { Box2dPhysics } from './physics-box2d';
import { ProgressMap } from './progressMap';
import { ThreeWorldRenderer } from './render/three/threeWorldRenderer';
import { RemoteGame } from './room/remoteGame';
import { isTrackedEntity, round3, type Snapshot } from './room/snapshot';
import type { EntityShape } from './types/MapEntity.type';
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
/** 초대방의 방장이 스냅샷을 보내는 간격 (ms). 모든 순위가 정해진 뒤에는 늦게 들어온 사람을 위해 가끔만 보낸다 */
const BROADCAST_MS = 50;
const BROADCAST_IDLE_MS = 500;

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
  private _lobby!: LobbyBox;
  /** 로비 화면이면 true. 게임 월드 대신 로비 박스를 돌리고 그린다 */
  private _inLobby = false;
  /** 사용자가 고른 배율. 로비 박스가 확대·축소해도 화면의 같은 자리에 머물도록 넘긴다 */
  private _userZoom = 1;

  /** 이번 판의 모든 구슬. 자리가 구슬 id 다 */
  private _roster: Marble[] = [];
  /** 출발했는지. 초대방에서 받아 보는 쪽은 스냅샷으로 안다 */
  private _started = false;
  /** startAfter 로 잡아 둔 출발 시각 (performance.now 기준). 없으면 null */
  private _startAt: number | null = null;
  /** 초대방에서 받아 보는 중이면 방장의 스냅샷을 따라 그리는 객체. 이때는 물리를 돌리지 않는다 */
  private _remote: RemoteGame | null = null;
  private _remoteCountdown: number | null = null;
  private _remoteStalled = false;
  /** 초대방의 방장이면 스냅샷을 내보낼 곳 */
  private _broadcast: { round: number; send: (snapshot: Snapshot) => void } | null = null;
  private _lastBroadcast = 0;
  /** 맵 데이터 안에서 장애물의 순번. 스냅샷에 장애물을 순번으로 싣는다 */
  private _entityIndex = new Map<EntityShape, number>();

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

    if (this._inLobby) {
      this._elapsed += currentTime - this._lastTime;
      if (this._elapsed > 100) this._elapsed %= 100;
      this._lastTime = currentTime;
      while (this._elapsed >= this._updateInterval) {
        this._lobby.step(this._updateInterval);
        this._elapsed -= this._updateInterval;
      }
      this._renderer.render(this._lobby.frame(this._renderer.viewSize, initialZoom, this._userZoom));
      window.requestAnimationFrame(this._update);
      return;
    }

    if (this._remote) {
      this._followRemote(currentTime - this._lastTime);
      this._lastTime = currentTime;
      this._updateCamera();
      this._render();
      window.requestAnimationFrame(this._update);
      return;
    }

    if (this._startAt !== null && performance.now() >= this._startAt) {
      this._startAt = null;
      this.start();
      this.dispatchEvent(new CustomEvent('started'));
    }

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

    this._updateCamera();
    this._render();
    this._sendSnapshot();
    window.requestAnimationFrame(this._update);
  }

  /** 결승 연출 강도 (0 ~ 1). 연출 구역이 있는 맵은 구역 강도, 없으면 zoomY 와의 거리로 정한다 */
  private get _intensity() {
    return this._zoomIntensity ?? Math.max(0, 1 - this._goalDist / zoomThreshold);
  }

  private _updateCamera() {
    if (!this._stage) return;
    const cameraTargetIndex = this._winners.length > 0 ? this._targetIndex : 0;
    this._camera.update({
      marbles: this._marbles,
      stage: this._stage,
      intensity: this._intensity,
      targetIndex: cameraTargetIndex,
      focusOnRival: cameraTargetIndex === this._targetIndex && this._focusOnRival,
      viewSize: { x: this._renderer.viewSize.x / initialZoom, y: this._renderer.viewSize.y / initialZoom },
    });
  }

  /**
   * 초대방에서 받아 보는 쪽의 한 프레임. 방장의 스냅샷에서 구슬 자리, 순위, 골인, 연출 값을 가져온다.
   * 카메라는 그 값으로 이 화면 크기에 맞게 따로 움직인다
   * @param deltaTime 지난 프레임에서 흐른 시간 (ms)
   */
  private _followRemote(deltaTime: number) {
    this._updateEffects(deltaTime);
    const view = this._remote?.sample(performance.now());
    if (!view) return;
    this._remoteCountdown = view.countdown;
    this._remoteStalled = view.stalled;
    if (view.countdown === null && !this._started) {
      this._started = true;
      this._isRunning = true;
      this._camera.startFollowingMarbles();
      this.dispatchEvent(new CustomEvent('started'));
    }
    const pick = (ids: number[]) => ids.flatMap((id) => (this._roster[id] ? [this._roster[id]] : []));
    this._marbles = pick(view.order);
    this._winners = pick(view.winners);
    this._zoomIntensity = view.intensity;
    this._focusOnRival = view.focusOnRival;

    if (!this._winner && this._winners.length > 0) {
      this._winner = this._winners[0];
      this._bursts.push(new GoalBurst(this._winner.x, this._winner.y, this._winner.hue));
      this.dispatchEvent(new CustomEvent('winner', { detail: { winner: this._winner.name } }));
    }
    if (view.finished && !this._finished) {
      this._isRunning = false;
      this._finished = true;
      this.dispatchEvent(new CustomEvent('finish'));
    }
  }

  /** 초대방의 방장이면 지금 모습을 스냅샷으로 내보낸다 */
  private _sendSnapshot() {
    if (!this._broadcast || !this._stage) return;
    const now = performance.now();
    if (now - this._lastBroadcast < (this._finished ? BROADCAST_IDLE_MS : BROADCAST_MS)) return;
    this._lastBroadcast = now;

    const stage = this._stage;
    const m: number[] = [];
    for (const marble of this._marbles) {
      const { x, y, angle } = marble.position;
      m.push(marble.id, round3(x), round3(y), round3(angle));
    }
    const e: number[] = [];
    for (const entity of this.physics.getEntities()) {
      const index = this._entityIndex.get(entity.shape);
      if (index !== undefined && isTrackedEntity(stage, index)) e.push(index, round3(entity.angle));
    }
    this._broadcast.send({
      r: this._broadcast.round,
      t: Math.round(now),
      c: this._started ? null : Math.max(0, Math.round((this._startAt ?? now) - now)),
      m,
      w: this._winners.map((marble) => marble.id),
      e,
      i: round3(this._intensity),
      f: this._focusOnRival,
      x: this._finished,
    });
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
    const entities = (this._remote ?? this.physics).getEntities();
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
      viewQuad: this._renderer.viewQuad,
      labels,
      countdown: this._remote
        ? this._remoteCountdown
        : this._startAt === null
          ? null
          : Math.max(0, this._startAt - performance.now()),
      stalled: this._remoteStalled,
    };
    for (const listener of this._frameListeners) listener(frame);
  }

  private async _init() {
    this.physics = new Box2dPhysics();
    const lobbyPhysics = new Box2dPhysics();
    await Promise.all([this.physics.init(), lobbyPhysics.init()]);
    this._lobby = new LobbyBox(lobbyPhysics);
    this._stage = stages[0];
    this._loadMap();
  }

  /**
   * 로비 화면의 구슬 박스를 이름 목록에 맞춰 보여준다. null 이면 박스를 비우고 게임 화면으로 돌아간다.
   * 박스는 게임과 다른 물리 월드라 추첨에 영향을 주지 않는다
   */
  public setLobby(entries: LobbyEntry[] | null) {
    this._inLobby = entries !== null;
    if (entries) this._lobby.setEntries(entries);
    else this._lobby.clear();
  }

  /** 게임 화면 캔버스. 끌고 굴려서 카메라 시점을 바꾸는 데 쓴다 */
  get canvas(): HTMLCanvasElement {
    return this._renderer.canvas;
  }

  /** 사용자가 고른 카메라 시점(각도, 배율) 을 반영한다 */
  public setCameraView(view: CameraView) {
    this._userZoom = view.zoom;
    this._renderer.setCameraView(view);
  }

  /** 누르고 있는 동안처럼 잠깐 빠르게 돌린다 */
  public setFastForward(on: boolean) {
    this._fastForward = on;
  }

  /** 카메라를 pos 로 옮기고 구슬을 따라가지 않게 한다. null 이면 다시 따라간다 (미니맵에서 맵을 훑어볼 때) */
  public lookAt(pos: VectorLike | null) {
    if (pos) {
      // 잠그기 전 자리를 기억해야 하므로 먼저 잠근다
      this._camera.lock(true);
      this._camera.setPosition(pos, false);
    } else {
      this._camera.lock(false);
    }
  }

  private _loadMap() {
    if (!this._stage) {
      throw new Error('No map has been selected');
    }

    this.physics.createStage(this._stage);
    this._entityIndex = new Map(this._stage.entities?.map((entity, index) => [entity.shape, index]));
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

  /** ms 뒤에 출발한다. 출발하면 'started' 이벤트를 낸다. 그때까지 HudFrame.countdown 이 남은 시간을 알린다 */
  public startAfter(ms: number) {
    this._startAt = performance.now() + ms;
  }

  /**
   * 초대방의 방장이 되어 스냅샷을 send 로 내보낸다. null 이면 그만둔다.
   * @param round 스냅샷에 실을 판 번호
   */
  public setBroadcast(round: number, send: ((snapshot: Snapshot) => void) | null) {
    this._broadcast = send ? { round, send } : null;
    this._lastBroadcast = 0;
  }

  /** 지금의 순위를 구슬 id 로. 골인한 구슬이 골인한 순서로 먼저 오고, 달리는 구슬이 진행 순위대로 뒤따른다 */
  get ranking(): number[] {
    return [...this._winners, ...this._marbles].map((marble) => marble.id);
  }

  /** 이번 판 구슬의 이름. 자리가 구슬 id 다. 초대방에서 받아 보는 쪽이 같은 구슬을 만드는 데 쓴다 */
  get roster(): string[] {
    return this._roster.map((marble) => marble.name);
  }

  /**
   * 초대방에서 방장의 경기를 받아 본다. 구슬을 names 대로 만들고(자리가 구슬 id) 물리 대신 스냅샷을 따라 그린다.
   * setMarbles 나 reset 을 부르면 끝난다
   */
  public watch(names: string[]) {
    this.reset();
    const remote = new RemoteGame(this._stage!);
    this._remote = remote;
    names.forEach((name, id) => this._roster.push(new Marble(remote, id, names.length, name)));
    this._marbles = [...this._roster];
    this._frameSpawn(names.length);
  }

  /** 방장이 보낸 스냅샷. watch 중이 아니면 버린다 */
  public pushSnapshot(snapshot: Snapshot) {
    this._remote?.push(snapshot, performance.now());
  }

  public start() {
    this._started = true;
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
        const marble = new Marble(this.physics, order, totalCount, member.name);
        this._marbles.push(marble);
        this._roster[order] = marble;
      }
    });
    this._frameSpawn(totalCount);
    return rejected;
  }

  /** 카메라를 구슬 생성 위치 중앙으로 이동 + 줌인 */
  private _frameSpawn(totalCount: number) {
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
    this._roster = [];
    this._started = false;
    this._startAt = null;
    this._remote = null;
    this._remoteCountdown = null;
    this._remoteStalled = false;
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
