import type { Camera } from '../camera';
import type { StageDef } from '../data/maps';
import type { GoalBurst } from '../goalBurst';
import type { Marble } from '../marble';
import type { MapEntityState } from '../types/MapEntity.type';
import type { VectorLike } from '../types/VectorLike';

/** 한 프레임에 월드를 그리는 데 필요한 상태. 좌표는 모두 물리 좌표다 (y 가 아래로 증가) */
export type WorldFrame = {
  camera: Camera;
  stage: StageDef;
  entities: MapEntityState[];
  marbles: Marble[];
  /** 1등 구슬이 골인한 자리의 축하 효과 */
  bursts: GoalBurst[];
  /**
   * 화면 크기 (장면 캔버스의 픽셀 단위). 줌 1 일 때 이 크기 / initialZoom 만큼의 월드가 보인다.
   * target 캔버스가 이보다 크면 같은 범위를 더 높은 해상도로 그린다
   */
  viewSize: VectorLike;
  /** marbles 에서 1등 후보로 강조할 구슬의 인덱스. 강조할 구슬이 없으면 음수 */
  winningIndex: number;
};

/** 월드 좌표에 2D 로 덧그리는 디버그 그림 */
export type WorldDebugDraw = (ctx: CanvasRenderingContext2D) => void;

/**
 * 월드(배경, 장애물, 이펙트, 구슬) 를 표시용 캔버스에 표시 해상도로 그린다.
 * HUD 는 이 위에 RouletteRenderer 가 따로 합성한다.
 */
export interface WorldRenderer {
  /** 장애물 아래에 월드 좌표로 덧그리는 그림 (테스트 플레이의 진행도 지도) */
  debugDraw: WorldDebugDraw | null;

  /** target 캔버스 전체를 이번 프레임의 월드로 채운다 */
  render(target: CanvasRenderingContext2D, frame: WorldFrame): void;
}
