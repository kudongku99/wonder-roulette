import type { StageDef } from '../data/maps';
import type { Marble } from '../marble';
import type { ScreenMarble } from '../render/three/marbleProjection';
import type { MapEntityState } from '../types/MapEntity.type';

/** 화면에 보이는 구슬 하나와 그 위치 */
export type MarbleLabel = ScreenMarble & { marble: Marble };

/** HUD 가 한 프레임을 그리는 데 읽는 게임 상태. 읽기만 하고 고치지 않는다 */
export type HudFrame = {
  stage: StageDef;
  entities: MapEntityState[];
  /** 아직 달리는 구슬. 진행 순위 순서다 */
  marbles: Marble[];
  /** 골인한 구슬. 골인한 순서다 */
  winners: Marble[];
  /** 진행 중에는 null, 1등이 확정되면 그 구슬 */
  winner: Marble | null;
  /** 모든 순위가 정해졌는지. 마지막 구슬은 골인하지 않아도 순위가 정해진다 */
  finished: boolean;
  /** 물리 좌표의 화면 중심과 줌 */
  camera: { x: number; y: number; zoom: number };
  /** 화면 네 모서리가 구슬 평면에 닿는 점 (물리 좌표, 왼쪽 위부터 시계 방향). 기울여 보면 사다리꼴이다 */
  viewQuad: [number, number][];
  /** 화면에 보이는 구슬들. marbles 와 같은 순서다 */
  labels: MarbleLabel[];
};
