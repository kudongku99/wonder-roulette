import { PerspectiveCamera, Vector3 } from 'three';
import { expect, test } from 'vitest';
import { initialZoom } from '../src/data/constants';
import { applyView2d, CAMERA_FOV, CAMERA_TILT, finishAngle, groundQuad, MAX_TILT } from '../src/render/three/cameraRig';

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
  applyView2d(camera, view, WIDTH, HEIGHT, { tilt: 0, yaw: 0 });

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

test('옆으로 돌아가 봐도 보는 점은 화면 가운데에 남는다', () => {
  const camera = new PerspectiveCamera(CAMERA_FOV);
  applyView2d(camera, { x: 12, y: 40, zoom: 3 }, WIDTH, HEIGHT, { tilt: 0.6, yaw: 0.2 });

  const center = project(camera, 12, 40);
  expect(center.x).toBeCloseTo(0);
  expect(center.y).toBeCloseTo(0);
  expect(camera.position.x).toBeGreaterThan(12);
});

test('결승 연출 각도는 줌인이 없으면 기본값이고 줌인이 깊을수록 더 기운다', () => {
  expect(finishAngle(1, 3)).toEqual({ tilt: CAMERA_TILT, yaw: 0 });
  expect(finishAngle(0.6, 3)).toEqual({ tilt: CAMERA_TILT, yaw: 0 });

  const half = finishAngle(2.5, 0);
  const full = finishAngle(4, 0);
  expect(half.tilt).toBeGreaterThan(CAMERA_TILT);
  expect(full.tilt).toBeGreaterThan(half.tilt);
  expect(finishAngle(9, 0).tilt).toBe(full.tilt);
});

test('결승 연출의 추가 기울기는 기본 각도에 비례하고 한계를 넘지 않는다', () => {
  const deg = (d: number) => (d * Math.PI) / 180;

  const at = (tilt: number) => finishAngle(4, 0, { tilt: deg(tilt), yaw: 0 }).tilt;
  expect(at(0)).toBe(0);
  expect(at(20)).toBeCloseTo(at(10) * 2);
  expect(at(-20)).toBeCloseTo(-at(20));
  expect(at(60)).toBe(MAX_TILT);
});

test('결승 연출의 좌우 흔들림은 사용자가 고른 좌우 각도를 중심으로 한다', () => {
  const base = { tilt: CAMERA_TILT, yaw: 0.3 };

  expect(finishAngle(1, 5, base).yaw).toBe(0.3);
  expect(finishAngle(4, 7 / 4, base).yaw).toBeGreaterThan(0.3);
  expect(finishAngle(4, (7 * 3) / 4, base).yaw).toBeLessThan(0.3);
});

test('기울이지 않으면 화면이 평면에 닿는 범위는 2D 와 같은 직사각형이다', () => {
  const view = { x: 12, y: 40, zoom: 2 };
  const camera = new PerspectiveCamera(CAMERA_FOV);
  applyView2d(camera, view, WIDTH, HEIGHT, { tilt: 0, yaw: 0 });

  const halfW = WIDTH / (initialZoom * view.zoom) / 2;
  const halfH = HEIGHT / (initialZoom * view.zoom) / 2;
  const expected = [
    [view.x - halfW, view.y - halfH],
    [view.x + halfW, view.y - halfH],
    [view.x + halfW, view.y + halfH],
    [view.x - halfW, view.y + halfH],
  ];
  groundQuad(camera).forEach(([x, y], i) => {
    expect(x).toBeCloseTo(expected[i][0]);
    expect(y).toBeCloseTo(expected[i][1]);
  });
});

test('기울여 보면 카메라에서 먼 화면 아래쪽이 더 넓고 더 멀리까지 닿는다', () => {
  const view = { x: 12, y: 40, zoom: 1 };
  const flat = new PerspectiveCamera(CAMERA_FOV);
  applyView2d(flat, view, WIDTH, HEIGHT, { tilt: 0, yaw: 0 });
  const tilted = new PerspectiveCamera(CAMERA_FOV);
  applyView2d(tilted, view, WIDTH, HEIGHT, { tilt: (30 * Math.PI) / 180, yaw: 0 });

  const [tl, tr, br, bl] = groundQuad(tilted);
  const [, , flatBr] = groundQuad(flat);
  expect(br[0] - bl[0]).toBeGreaterThan(tr[0] - tl[0]);
  expect(br[1]).toBeGreaterThan(flatBr[1]);
});
