import type { PerspectiveCamera } from 'three';
import { initialZoom } from '../../data/constants';

export const CAMERA_FOV = 40;
/** 카메라를 위로 들어 올려 장애물 윗면이 보이게 하는 각도 (라디안) */
export const CAMERA_TILT = 0.3;

export type View2d = { x: number; y: number; zoom: number };

/**
 * 2D 카메라의 (x, y, zoom) 을 원근 카메라에 옮긴다. 물리 좌표를 받아 Three.js 좌표(y 가 위) 의 카메라를 놓는다.
 * 구슬이 구르는 평면(z = 0) 에서 화면 가운데 세로로 보이는 범위가 2D 와 같아지는 거리에 둔다
 * (기울이면 평면이 비스듬히 보여 위아래 끝은 조금 더 보인다).
 */
export function applyView2d(
  camera: PerspectiveCamera,
  view: View2d,
  viewportWidth: number,
  viewportHeight: number,
  tilt: number = CAMERA_TILT
) {
  const visibleHeight = viewportHeight / (initialZoom * view.zoom);
  const distance = visibleHeight / 2 / Math.tan((camera.fov * Math.PI) / 360);
  const targetY = -view.y;

  camera.aspect = viewportWidth / viewportHeight;
  camera.near = Math.max(0.1, distance / 100);
  camera.far = distance * 4 + 100;
  camera.position.set(view.x, targetY + Math.sin(tilt) * distance, Math.cos(tilt) * distance);
  camera.up.set(0, 1, 0);
  camera.lookAt(view.x, targetY, 0);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
}
