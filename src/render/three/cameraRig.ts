import { type PerspectiveCamera, Vector3 } from 'three';
import { initialZoom } from '../../data/constants';

export const CAMERA_FOV = 40;
/** 카메라를 위로 들어 올려 장애물 윗면이 보이게 하는 기본 각도 (라디안). 게임 화면을 끌어 바꿀 수 있다 */
export const CAMERA_TILT = (17 * Math.PI) / 180;
/** 결승 연출로 줌인이 끝까지 걸렸을 때 기본 각도에 더하는 비율. 기본 각도가 0 이면 더 기울지 않는다 */
const FINISH_TILT_RATIO = 0.35 / 0.3;
/** 결승 연출을 더한 각도의 한계. 이보다 기울면 화면 위쪽이 지평선 너머로 넘어간다 */
export const MAX_TILT = (60 * Math.PI) / 180;
/** 결승 연출 중 좌우로 도는 폭과 한 번 왕복하는 시간 (초) */
const FINISH_YAW = 0.22;
const FINISH_YAW_PERIOD = 7;
/** 2D 카메라의 줌이 이 값일 때 결승 연출이 끝까지 걸린 것으로 본다 (Camera 가 연출 강도 × 4 까지 줌인한다) */
const FINISH_ZOOM = 4;

export type View2d = { x: number; y: number; zoom: number };
export type CameraAngle = { tilt: number; yaw: number };

/**
 * 결승 연출용 카메라 각도. 줌인이 깊어질수록 기본 기울기에 비례해 더 기울이고, 기본 좌우 각도를 중심으로 천천히 돈다.
 * 기본 기울기가 음수면(아래에서 올려다보면) 그쪽으로 더 기운다.
 * @param seconds 흐르는 시간. 좌우로 도는 위치를 정한다
 * @param base 사용자가 고른 기본 각도 (라디안)
 */
export function finishAngle(
  zoom: number,
  seconds: number,
  base: CameraAngle = { tilt: CAMERA_TILT, yaw: 0 }
): CameraAngle {
  const t = Math.min(1, Math.max(0, (zoom - 1) / (FINISH_ZOOM - 1)));
  const ease = t * t * (3 - 2 * t);
  const tilt = base.tilt * (1 + FINISH_TILT_RATIO * ease);
  return {
    tilt: Math.max(-MAX_TILT, Math.min(MAX_TILT, tilt)),
    yaw: base.yaw + FINISH_YAW * ease * Math.sin((seconds * Math.PI * 2) / FINISH_YAW_PERIOD),
  };
}

/**
 * 2D 카메라의 (x, y, zoom) 을 원근 카메라에 옮긴다. 물리 좌표를 받아 Three.js 좌표(y 가 위) 의 카메라를 놓는다.
 * 구슬이 구르는 평면(z = 0) 에서 화면 가운데 세로로 보이는 범위가 2D 와 같아지는 거리에 둔다
 * (기울이면 평면이 비스듬히 보여 위아래 끝은 조금 더 보인다).
 * tilt 는 위에서 내려다보는 각도, yaw 는 옆으로 돌아가 보는 각도다. 어느 쪽이든 보는 점은 화면 가운데에 남는다.
 */
export function applyView2d(
  camera: PerspectiveCamera,
  view: View2d,
  viewportWidth: number,
  viewportHeight: number,
  angle: CameraAngle = { tilt: CAMERA_TILT, yaw: 0 }
) {
  const visibleHeight = viewportHeight / (initialZoom * view.zoom);
  const distance = visibleHeight / 2 / Math.tan((camera.fov * Math.PI) / 360);
  const targetY = -view.y;
  const flat = Math.cos(angle.tilt) * distance;

  camera.aspect = viewportWidth / viewportHeight;
  camera.near = Math.max(0.1, distance / 100);
  camera.far = distance * 4 + 100;
  camera.position.set(
    view.x + Math.sin(angle.yaw) * flat,
    targetY + Math.sin(angle.tilt) * distance,
    Math.cos(angle.yaw) * flat
  );
  camera.up.set(0, 1, 0);
  camera.lookAt(view.x, targetY, 0);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
}

const corner = new Vector3();
const ray = new Vector3();
const SCREEN_CORNERS: [number, number][] = [
  [-1, 1],
  [1, 1],
  [1, -1],
  [-1, -1],
];

/**
 * 화면 네 모서리가 구슬이 구르는 평면(z = 0) 에서 닿는 점. 물리 좌표로 왼쪽 위, 오른쪽 위, 오른쪽 아래, 왼쪽 아래 순서다.
 * 기울여 보면 먼 쪽(화면 위) 이 더 넓은 사다리꼴이 된다. camera 는 위치가 반영된 상태여야 한다.
 */
export function groundQuad(camera: PerspectiveCamera): [number, number][] {
  const origin = camera.position;
  return SCREEN_CORNERS.map(([sx, sy]) => {
    ray.copy(corner.set(sx, sy, 0.5).unproject(camera)).sub(origin);
    // 평면에 닿지 않는 방향이면 보이는 끝(far) 까지만 간다
    const t = ray.z < 0 ? -origin.z / ray.z : camera.far / ray.length();
    return [origin.x + ray.x * t, -(origin.y + ray.y * t)];
  });
}
