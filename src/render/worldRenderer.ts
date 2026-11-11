import type { Camera } from '../camera';
import type { StageDef } from '../data/maps';
import type { GoalBurst } from '../goalBurst';
import type { Marble } from '../marble';
import type { SkillEffect } from '../skillEffect';
import type { ColorTheme } from '../types/ColorTheme';
import type { MapEntityState } from '../types/MapEntity.type';
import type { VectorLike } from '../types/VectorLike';

/** 한 프레임에 월드를 그리는 데 필요한 상태. 좌표는 모두 물리 좌표다 (y 가 아래로 증가) */
export type WorldFrame = {
  camera: Camera;
  stage: StageDef;
  entities: MapEntityState[];
  marbles: Marble[];
  effects: SkillEffect[];
  /** 당첨 구슬이 골인한 자리의 축하 효과 */
  bursts: GoalBurst[];
  theme: ColorTheme;
  /**
   * 화면 크기 (장면 캔버스의 픽셀 단위). 줌 1 일 때 이 크기 / initialZoom 만큼의 월드가 보인다.
   * target 캔버스가 이보다 크면 같은 범위를 더 높은 해상도로 그린다
   */
  viewSize: VectorLike;
  /** marbles 에서 당첨 범위에 드는 인덱스 구간 (양끝 포함). 이 구슬들을 강조한다 */
  winning: { first: number; last: number };
  /** 구슬 이름에 해당하는 스킨 이미지. 없으면 undefined */
  skinOf(name: string): CanvasImageSource | undefined;
};

/** 월드 좌표에 2D 로 덧그리는 디버그 그림 */
export type WorldDebugDraw = (ctx: CanvasRenderingContext2D) => void;

/**
 * 월드(배경, 장애물, 이펙트, 구슬) 를 장면 캔버스에 그린다.
 * HUD 는 이 위에 RouletteRenderer 가 따로 그린다.
 */
export interface WorldRenderer {
  /**
   * true 면 표시용 캔버스에 표시 해상도로 직접 그린다. HUD 는 그 위에 따로 합성된다.
   * false 면 원본처럼 장면 캔버스(절반 해상도) 에 그리고 HUD 와 함께 확대된다
   */
  readonly rendersAtDisplayResolution: boolean;

  /** true 면 frame.bursts 를 월드 안에 그린다. false 면 원본처럼 HUD 의 화면 파티클이 축하 효과를 맡는다 */
  readonly drawsGoalBursts: boolean;

  /** 장애물 아래에 월드 좌표로 덧그리는 그림 (테스트 플레이의 진행도 지도) */
  debugDraw: WorldDebugDraw | null;

  /** target 캔버스 전체를 이번 프레임의 월드로 채운다 */
  render(target: CanvasRenderingContext2D, frame: WorldFrame): void;
}
