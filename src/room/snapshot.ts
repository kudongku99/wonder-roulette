import type { StageDef } from '../data/maps';
import type { MapEntityState } from '../types/MapEntity.type';

/**
 * 방장이 경기 중에 주기적으로 보내는 한 순간의 모습. 참가자는 이것만으로 화면을 그린다.
 * 자주 보내므로 키를 한 글자로 줄였다
 */
export type Snapshot = {
  /** 몇 번째 판인지 (RoomState.round) */
  r: number;
  /** 방장 쪽 시각 (ms). 참가자가 두 스냅샷 사이를 이어 그리는 기준이다 */
  t: number;
  /** 출발까지 남은 시간 (ms). 출발한 뒤에는 null */
  c: number | null;
  /** 달리는 구슬. 진행 순위 순서로 [id, x, y, 각도] 를 이어 붙였다 */
  m: number[];
  /** 골인한 구슬의 id. 골인한 순서다 */
  w: number[];
  /** 움직이거나 부서지는 장애물 중 남아 있는 것. [맵 안의 순번, 각도] 를 이어 붙였다 */
  e: number[];
  /** 결승 연출 강도 (0 ~ 1) */
  i: number;
  /** 연출이 1등 후보가 아니라 경쟁 구슬 때문에 걸렸는지 */
  f: boolean;
  /** 모든 순위가 정해졌는지 */
  x: boolean;
};

/** 스냅샷 메시지의 첫 글자. 서버는 이 글자만 보고 내용을 읽지 않은 채 방 안에 그대로 넘긴다 */
export const SNAPSHOT_PREFIX = 's';
export const MAX_SNAPSHOT_LENGTH = 16_000;

/** 좌표를 1/1000 단위로 줄인다. 화면에서 구분되지 않고 보내는 양이 준다 */
export function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function encodeSnapshot(snapshot: Snapshot): string {
  return SNAPSHOT_PREFIX + JSON.stringify(snapshot);
}

const isNumbers = (value: unknown, group: number): value is number[] =>
  Array.isArray(value) && value.length % group === 0 && value.every((item) => Number.isFinite(item));

/** 받은 글을 스냅샷으로 읽는다. 방장의 브라우저가 보낸 것이라 모양을 확인하고, 틀리면 null */
export function parseSnapshot(raw: string): Snapshot | null {
  if (raw[0] !== SNAPSHOT_PREFIX || raw.length > MAX_SNAPSHOT_LENGTH) return null;
  let data: any;
  try {
    data = JSON.parse(raw.slice(1));
  } catch {
    return null;
  }
  if (typeof data !== 'object' || data === null) return null;
  const valid =
    Number.isInteger(data.r) &&
    Number.isFinite(data.t) &&
    (data.c === null || Number.isFinite(data.c)) &&
    isNumbers(data.m, 4) &&
    isNumbers(data.w, 1) &&
    isNumbers(data.e, 2) &&
    Number.isFinite(data.i) &&
    typeof data.f === 'boolean' &&
    typeof data.x === 'boolean';
  return valid ? (data as Snapshot) : null;
}

/** 경기 중에 상태가 바뀌는 장애물(도는 것, 닿으면 부서지는 것) 인지. 나머지는 맵 데이터 그대로라 보내지 않는다 */
export function isTrackedEntity(stage: StageDef, index: number): boolean {
  const entity = stage.entities?.[index];
  return !!entity && (entity.type === 'kinematic' || entity.props.life !== undefined);
}

/** 맵 데이터만으로 만든 장애물의 처음 상태. 물리 엔진이 맵을 올린 직후에 돌려주는 것과 같다 */
export function initialEntities(stage: StageDef): MapEntityState[] {
  return (stage.entities ?? []).map((entity) => ({
    x: entity.position.x,
    y: entity.position.y,
    angle: 0,
    shape: entity.shape,
    life: entity.props.life ?? -1,
  }));
}
