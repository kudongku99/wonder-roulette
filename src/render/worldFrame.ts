import type { Camera } from '../camera';
import type { StageDef } from '../data/maps';
import type { GoalBurst } from '../goalBurst';
import type { Marble } from '../marble';
import type { MapEntityState } from '../types/MapEntity.type';

/** 한 프레임에 월드를 그리는 데 필요한 상태. 좌표는 모두 물리 좌표다 (y 가 아래로 증가) */
export type WorldFrame = {
  camera: Camera;
  stage: StageDef;
  entities: MapEntityState[];
  marbles: Marble[];
  /** 1등 구슬이 골인한 자리의 축하 효과 */
  bursts: GoalBurst[];
};

/** 월드 좌표에 2D 로 덧그리는 디버그 그림 */
export type WorldDebugDraw = (ctx: CanvasRenderingContext2D) => void;
