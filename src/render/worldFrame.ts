import type { StageDef } from '../data/maps';
import type { GoalBurst } from '../goalBurst';
import type { MapEntityState } from '../types/MapEntity.type';

/** 그릴 구슬 하나. 게임의 Marble 과 로비 박스의 구슬이 모두 이 모양이다 */
export type MarbleBody = {
  position: { x: number; y: number; angle: number };
  /** 색 (0 ~ 360) */
  hue: number;
  /** 크기 배율. 없으면 1. 구슬이 사라지는 효과에 쓴다 */
  scale?: number;
};

/** 한 프레임에 월드를 그리는 데 필요한 상태. 좌표는 모두 물리 좌표다 (y 가 아래로 증가) */
export type WorldFrame = {
  /** 물리 좌표의 화면 중심과 줌, 결승 연출이 걸린 정도 (0 ~ 1, 없으면 0) */
  camera: { x: number; y: number; zoom: number; finish?: number };
  stage: StageDef;
  entities: MapEntityState[];
  marbles: MarbleBody[];
  /** 1등 구슬이 골인한 자리의 축하 효과 */
  bursts: GoalBurst[];
  /** false 면 맵 안팎을 칠한 바닥을 깔지 않는다 (로비 박스처럼 맵 목록에 없는 무대) */
  floor?: boolean;
};

/** 월드 좌표에 2D 로 덧그리는 디버그 그림 */
export type WorldDebugDraw = (ctx: CanvasRenderingContext2D) => void;
