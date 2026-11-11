import type { StageDef } from '../data/maps';
import type { Marble } from '../marble';
import type { ScreenMarble } from '../render/three/marbleProjection';
import type { MapEntityState } from '../types/MapEntity.type';
import type { VectorLike } from '../types/VectorLike';

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
  /** 물리 좌표의 화면 중심과 줌 */
  camera: { x: number; y: number; zoom: number };
  /** 보이는 월드 범위의 기준이 되는 화면 크기. 줌 1 일 때 이 크기 / initialZoom 만큼의 월드가 보인다 */
  viewSize: VectorLike;
  /** 화면에 보이는 구슬들. marbles 와 같은 순서다 */
  labels: MarbleLabel[];
};
