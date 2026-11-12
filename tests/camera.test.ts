import { expect, test } from 'vitest';
import { Camera } from '../src/camera';

function settle(camera: Camera) {
  for (let i = 0; i < 300; i++) {
    camera.update({
      marbles: [],
      stage: { title: 't', goalY: 100, zoomY: 90 },
      intensity: 0,
      targetIndex: 0,
      focusOnRival: false,
      viewSize: { x: 20, y: 12 },
    });
  }
}

test('시작 전에 미니맵으로 다른 곳을 봤다가 놓으면 원래 자리로 돌아간다', () => {
  const camera = new Camera();
  camera.initializePosition({ x: 12, y: 2 }, 1.5);

  camera.lock(true);
  camera.setPosition({ x: 20, y: 80 });
  settle(camera);
  expect(camera.y).toBeCloseTo(80);

  camera.lock(false);
  settle(camera);
  expect(camera.x).toBeCloseTo(12);
  expect(camera.y).toBeCloseTo(2);
});

test('구슬을 따라가는 중에는 놓은 자리에서 다시 구슬을 따라간다', () => {
  const camera = new Camera();
  camera.initializePosition({ x: 12, y: 2 }, 1.5);
  camera.startFollowingMarbles();

  camera.lock(true);
  camera.setPosition({ x: 20, y: 80 });
  settle(camera);
  camera.lock(false);

  // 따라갈 구슬이 없으면 자리는 그대로다 (원래 자리로 되돌리지 않는다)
  settle(camera);
  expect(camera.y).toBeCloseTo(80);
});

test('결승 연출 강도는 줌과 따로 서서히 따라가고, 시작 전 줌인은 연출로 치지 않는다', () => {
  const camera = new Camera();
  camera.initializePosition({ x: 12, y: 2 }, 3);
  expect(camera.zoom).toBe(3);
  expect(camera.finish).toBe(0);

  camera.update({
    marbles: [],
    stage: { title: 't', goalY: 100, zoomY: 90 },
    intensity: 1,
    targetIndex: 0,
    focusOnRival: false,
    viewSize: { x: 20, y: 12 },
  });
  expect(camera.finish).toBeGreaterThan(0);
  expect(camera.finish).toBeLessThan(1);
});
