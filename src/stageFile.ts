// 맵 파일(JSON) 을 읽어 게임이 돌릴 수 있는 형태인지 확인한다.
// 형태 확인은 원본(lazygyu/roulette) 의 communityMaps.ts 에서 가져왔다.

import type { StageDef } from './data/maps';
import type { MapEntity } from './types/MapEntity.type';

/** 게임이 멈추지 않을 정도만 막는 상한 */
const MAX_ENTITIES = 1000;
const MAX_POINTS = 1000;

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function isEntity(v: unknown): v is MapEntity {
  if (!isObj(v) || (v.type !== 'static' && v.type !== 'kinematic')) return false;
  const { position, shape, props } = v;
  if (!isObj(position) || !isNum(position.x) || !isNum(position.y)) return false;
  if (!isObj(props) || !isNum(props.density) || !isNum(props.restitution) || !isNum(props.angularVelocity)) {
    return false;
  }
  if (props.life !== undefined && !isNum(props.life)) return false;
  if (!isObj(shape)) return false;
  switch (shape.type) {
    case 'box':
      return isNum(shape.width) && isNum(shape.height) && isNum(shape.rotation);
    case 'circle':
      return isNum(shape.radius) && shape.radius > 0;
    case 'polyline':
      return (
        Array.isArray(shape.points) &&
        shape.points.length >= 2 &&
        shape.points.length <= MAX_POINTS &&
        shape.points.every((p) => Array.isArray(p) && p.length === 2 && isNum(p[0]) && isNum(p[1]))
      );
    default:
      return false;
  }
}

function isZoneList(v: unknown): boolean {
  return (
    Array.isArray(v) &&
    v.every((z) => isObj(z) && isNum(z.x) && isNum(z.y) && isNum(z.w) && isNum(z.h) && z.w > 0 && z.h > 0)
  );
}

function isPoint(v: unknown): boolean {
  return Array.isArray(v) && v.length === 2 && isNum(v[0]) && isNum(v[1]);
}

/** 게임이 돌릴 수 있는 형태인지만 본다 */
export function isPlayableStage(v: unknown): v is StageDef {
  if (!isObj(v) || typeof v.title !== 'string' || !isNum(v.goalY) || !isNum(v.zoomY)) return false;
  if (!Array.isArray(v.entities) || v.entities.length === 0 || v.entities.length > MAX_ENTITIES) return false;
  if (!v.entities.every(isEntity)) return false;
  if (v.adBoards !== undefined) {
    if (!Array.isArray(v.adBoards) || !v.adBoards.every((b) => isObj(b) && isNum(b.x) && isNum(b.y))) return false;
  }
  if (v.progress !== undefined) {
    if (!isObj(v.progress)) return false;
    const oneWays = v.progress.oneWays;
    if (
      oneWays !== undefined &&
      (!Array.isArray(oneWays) || !oneWays.every((l) => isObj(l) && isPoint(l.from) && isPoint(l.to)))
    ) {
      return false;
    }
  }
  if (v.zoomZones !== undefined && !isZoneList(v.zoomZones)) return false;
  if (v.cameraZones !== undefined && !isZoneList(v.cameraZones)) return false;
  return true;
}

/**
 * 맵 파일 내용을 읽는다. StageDef 그 자체이거나, 원본 맵 공유마당의 꾸러미처럼 stage 필드에 담겨 있어도 된다.
 * 읽을 수 없거나 형태가 맞지 않으면 null
 */
export function parseStageFile(text: string): StageDef | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (isPlayableStage(parsed)) return parsed;
  if (isObj(parsed) && isPlayableStage(parsed.stage)) return parsed.stage;
  return null;
}
