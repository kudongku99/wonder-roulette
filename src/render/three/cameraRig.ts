import type { PerspectiveCamera } from 'three';
import { initialZoom } from '../../data/constants';

export const CAMERA_FOV = 40;
/** 카메라를 위로 들어 올려 장애물 윗면이 보이게 하는 각도 (라디안) */
export const CAMERA_TILT = 0.3;
/** 결승 연출로 줌인이 끝까지 걸렸을 때 더 기울이는 각도 */
const FINISH_EXTRA_TILT = 0.35;
/** 결승 연출 중 좌우로 도는 폭과 한 번 왕복하는 시간 (초) */
const FINISH_YAW = 0.22;
const FINISH_YAW_PERIOD = 7;
/** 2D 카메라의 줌이 이 값일 때 결승 연출이 끝까지 걸린 것으로 본다 (Camera 가 연출 강도 × 4 까지 줌인한다) */
const FINISH_ZOOM = 4;

export type View2d = { x: number; y: number; zoom: number };
export type CameraAngle = { tilt: number; yaw: number };

/**
 * 결승 연출용 카메라 각도. 줌인이 깊어질수록 더 기울이고 좌우로 천천히 돈다.
 * @param seconds 흐르는 시간. 좌우로 도는 위치를 정한다
 */
export function finishAngle(zoom: number, seconds: number): CameraAngle {
  const t = Math.min(1, Math.max(0, (zoom - 1) / (FINISH_ZOOM - 1)));
  const ease = t * t * (3 - 2 * t);
  return {
    tilt: CAMERA_TILT + FINISH_EXTRA_TILT * ease,
    yaw: FINISH_YAW * ease * Math.sin((seconds * Math.PI * 2) / FINISH_YAW_PERIOD),
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
