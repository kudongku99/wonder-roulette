import { PerspectiveCamera } from 'three';
import { expect, test } from 'vitest';
import { applyView2d, CAMERA_FOV } from '../src/render/three/cameraRig';
import { projectMarble } from '../src/render/three/marbleProjection';

const WIDTH = 800;
const HEIGHT = 450;

function cameraAt(x: number, y: number, zoom: number, tilt = 0) {
  const camera = new PerspectiveCamera(CAMERA_FOV);
  applyView2d(camera, { x, y, zoom }, WIDTH, HEIGHT, { tilt, yaw: 0 });
  return camera;
}

test('카메라가 보는 점의 구슬은 화면 가운데에 온다', () => {
  const screen = projectMarble(cameraAt(12, 40, 2), 12, 40, 0.25);

  expect(screen?.x).toBeCloseTo(0.5);
  expect(screen?.y).toBeCloseTo(0.5);
});

test('물리 좌표에서 오른쪽 아래에 있는 구슬은 화면에서도 오른쪽 아래다', () => {
  const screen = projectMarble(cameraAt(12, 40, 1), 14, 42, 0.25);

  expect(screen?.x).toBeGreaterThan(0.5);
  expect(screen?.y).toBeGreaterThan(0.5);
});

test('반지름은 화면 너비에 대한 비율이고 줌에 비례한다', () => {
  // 기울이지 않고 줌 1 이면 화면 너비에 WIDTH / 30 단위가 보인다
  const near = projectMarble(cameraAt(12, 40, 1), 12, 40, 0.25);
  const far = projectMarble(cameraAt(12, 40, 2), 12, 40, 0.25);

  expect(near?.r).toBeCloseTo(0.25 / (WIDTH / 30));
  expect(far?.r).toBeCloseTo((near?.r ?? 0) * 2);
});

test('화면에서 멀리 벗어난 구슬은 null 이다', () => {
  const camera = cameraAt(12, 40, 1, 0.3);

  expect(projectMarble(camera, 12, 300, 0.25)).toBeNull();
  expect(projectMarble(camera, 12, 41, 0.25)).not.toBeNull();
});
