import { type PerspectiveCamera, Vector3 } from 'three';

const center = new Vector3();
const edge = new Vector3();
const right = new Vector3();
/** 화면 밖으로 이만큼(화면 절반 대비 비율) 벗어난 구슬까지는 돌려준다. 이름표가 화면 안으로 걸칠 수 있다 */
const OFFSCREEN_MARGIN = 0.2;

/** 화면에서의 구슬 위치. x, y 는 왼쪽 위가 0, 오른쪽 아래가 1 인 비율이고 r 은 화면 너비에 대한 반지름 비율이다 */
export type ScreenMarble = { x: number; y: number; r: number };

/**
 * 물리 좌표의 구슬이 화면 어디에 얼마나 크게 보이는지 구한다. 화면에서 벗어났으면 null.
 * camera 는 이번 프레임의 위치가 반영된 상태여야 한다.
 */
export function projectMarble(camera: PerspectiveCamera, x: number, y: number, radius: number): ScreenMarble | null {
  right.setFromMatrixColumn(camera.matrixWorld, 0);
  center.set(x, -y, 0);
  edge.copy(center).addScaledVector(right, radius).project(camera);
  center.project(camera);
  if (center.z > 1 || Math.abs(center.x) > 1 + OFFSCREEN_MARGIN || Math.abs(center.y) > 1 + OFFSCREEN_MARGIN) {
    return null;
  }
  return { x: (center.x + 1) / 2, y: (1 - center.y) / 2, r: (edge.x - center.x) / 2 };
}
