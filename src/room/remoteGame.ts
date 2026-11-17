import type { StageDef } from '../data/maps';
import type { IPhysics } from '../IPhysics';
import type { MapEntityState } from '../types/MapEntity.type';
import { initialEntities, isTrackedEntity, type Snapshot } from './snapshot';

/** 받은 것보다 이만큼 늦게 그린다 (ms). 스냅샷이 고르지 않게 와도 사이를 이어 그릴 여유다 */
export const RENDER_DELAY_MS = 120;
/** 이 시간 동안 스냅샷이 없으면 방장 쪽이 멈춘 것으로 본다 (ms) */
export const STALL_MS = 1500;
const MAX_BUFFER = 200;

type Position = { x: number; y: number; angle: number };

/** 지금 그릴 순간의, 이어 그릴 수 없는 값들 */
export type RemoteView = {
  /** 출발까지 남은 시간 (ms). 출발한 뒤에는 null */
  countdown: number | null;
  /** 달리는 구슬의 id. 진행 순위 순서다 */
  order: number[];
  /** 골인한 구슬의 id. 골인한 순서다 */
  winners: number[];
  intensity: number;
  focusOnRival: boolean;
  finished: boolean;
  /** 방장 쪽에서 한동안 소식이 없다 */
  stalled: boolean;
};

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/**
 * 방장이 보낸 스냅샷으로 경기를 따라 그린다. 물리를 돌리지 않고, 조금 늦은 시각의 앞뒤 스냅샷 사이를 이어
 * 구슬과 장애물의 자리를 낸다. 게임의 구슬(Marble) 이 자리를 물리에서 읽으므로 물리 자리에 끼워 쓴다.
 */
export class RemoteGame implements IPhysics {
  private _buffer: { snapshot: Snapshot; at: number }[] = [];
  /** 방장 시각 − 내 시각. 가장 빨리 도착한 스냅샷 기준이라 망 지연이 가장 적었을 때의 값이다 */
  private _offset = -Infinity;
  private _positions = new Map<number, Position>();
  private _base: MapEntityState[];
  private _entities: MapEntityState[];

  constructor(private stage: StageDef) {
    this._base = initialEntities(stage);
    this._entities = this._base;
  }

  /** @param now 받은 시각 (ms). sample 에 넘기는 것과 같은 시계다 */
  push(snapshot: Snapshot, now: number) {
    const last = this._buffer[this._buffer.length - 1];
    if (last && snapshot.t <= last.snapshot.t) return;
    this._offset = Math.max(this._offset, snapshot.t - now);
    this._buffer.push({ snapshot, at: now });
    if (this._buffer.length > MAX_BUFFER) this._buffer.shift();
  }

  /** 지금 그릴 순간으로 구슬과 장애물의 자리를 맞춘다. 아직 받은 것이 없으면 null */
  sample(now: number): RemoteView | null {
    if (this._buffer.length === 0) return null;
    const time = now + this._offset - RENDER_DELAY_MS;
    while (this._buffer.length >= 2 && this._buffer[1].snapshot.t <= time) {
      // 건너뛰는 스냅샷에만 있던 구슬(그 사이에 골인한 구슬) 의 마지막 자리를 남겨 둔다
      const { m } = this._buffer.shift()!.snapshot;
      for (let i = 0; i < m.length; i += 4) this._positions.set(m[i], { x: m[i + 1], y: m[i + 2], angle: m[i + 3] });
    }
    const a = this._buffer[0].snapshot;
    const b = this._buffer[1]?.snapshot;
    const k = b ? Math.min(1, Math.max(0, (time - a.t) / (b.t - a.t))) : 0;

    const next = new Map<number, number>();
    if (b) for (let i = 0; i < b.m.length; i += 4) next.set(b.m[i], i);
    const order: number[] = [];
    for (let i = 0; i < a.m.length; i += 4) {
      const id = a.m[i];
      const j = next.get(id);
      order.push(id);
      this._positions.set(
        id,
        j === undefined || !b
          ? { x: a.m[i + 1], y: a.m[i + 2], angle: a.m[i + 3] }
          : {
              x: lerp(a.m[i + 1], b.m[j + 1], k),
              y: lerp(a.m[i + 2], b.m[j + 2], k),
              angle: lerp(a.m[i + 3], b.m[j + 3], k),
            }
      );
    }

    const nextAngles = new Map<number, number>();
    if (b) for (let i = 0; i < b.e.length; i += 2) nextAngles.set(b.e[i], b.e[i + 1]);
    const angles = new Map<number, number>();
    for (let i = 0; i < a.e.length; i += 2) {
      const to = nextAngles.get(a.e[i]);
      angles.set(a.e[i], to === undefined ? a.e[i + 1] : lerp(a.e[i + 1], to, k));
    }
    this._entities = [];
    this._base.forEach((entity, index) => {
      if (!isTrackedEntity(this.stage, index)) this._entities.push(entity);
      else if (angles.has(index)) this._entities.push({ ...entity, angle: angles.get(index)! });
    });

    return {
      countdown: a.c === null ? null : Math.max(0, a.c - Math.max(0, time - a.t)),
      order,
      winners: a.w,
      intensity: b ? lerp(a.i, b.i, k) : a.i,
      focusOnRival: a.f,
      finished: a.x,
      stalled: !a.x && now - this._buffer[this._buffer.length - 1].at > STALL_MS,
    };
  }

  /** 스냅샷에서 빠진 구슬(골인한 구슬) 은 마지막으로 본 자리를 돌려준다 */
  getMarblePosition(id: number): Position {
    return this._positions.get(id) ?? { x: 0, y: 0, angle: 0 };
  }

  getEntities(): MapEntityState[] {
    return this._entities;
  }

  /** 첫 스냅샷이 오기 전에 보일 출발 자리 */
  createMarble(id: number, x: number, y: number) {
    this._positions.set(id, { x, y, angle: 0 });
  }

  async init() {}
  clear() {}
  clearMarbles() {}
  createStage() {}
  shakeMarble() {}
  removeMarble() {}
  start() {}
  step() {}
}
