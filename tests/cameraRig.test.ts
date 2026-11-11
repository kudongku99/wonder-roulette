import { PerspectiveCamera, Vector3 } from 'three';
import { expect, test } from 'vitest';
import { initialZoom } from '../src/data/constants';
import { applyView2d, CAMERA_FOV } from '../src/render/three/cameraRig';

const WIDTH = 800;
const HEIGHT = 450;

/** 물리 좌표의 점이 화면에서 어디에 찍히는지 (-1 ~ 1, 위와 오른쪽이 +) */
function project(camera: PerspectiveCamera, x: number, y: number) {
  return new Vector3(x, -y, 0).project(camera);
}

test('2D 카메라가 보는 점이 화면 가운데에 온다', () => {
  const camera = new PerspectiveCamera(CAMERA_FOV);
  applyView2d(camera, { x: 12, y: 40, zoom: 2 }, WIDTH, HEIGHT);

  const center = project(camera, 12, 40);
  expect(center.x).toBeCloseTo(0);
  expect(center.y).toBeCloseTo(0);
});

test('기울이지 않으면 2D 와 같은 범위가 화면에 꽉 찬다', () => {
  const view = { x: 12, y: 40, zoom: 2 };
  const camera = new PerspectiveCamera(CAMERA_FOV);
  applyView2d(camera, view, WIDTH, HEIGHT, 0);

  const halfW = WIDTH / (initialZoom * view.zoom) / 2;
  const halfH = HEIGHT / (initialZoom * view.zoom) / 2;
  const corner = project(camera, view.x + halfW, view.y + halfH);
  expect(corner.x).toBeCloseTo(1);
  expect(corner.y).toBeCloseTo(-1);
});

test('물리 좌표에서 아래(y 증가) 는 화면에서도 아래다', () => {
  const camera = new PerspectiveCamera(CAMERA_FOV);
  applyView2d(camera, { x: 12, y: 40, zoom: 1 }, WIDTH, HEIGHT);

  expect(project(camera, 12, 42).y).toBeLessThan(0);
  expect(project(camera, 14, 40).x).toBeGreaterThan(0);
});
