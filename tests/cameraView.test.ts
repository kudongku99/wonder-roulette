import { expect, test } from 'vitest';
import {
  DEFAULT_CAMERA_VIEW,
  DEGREES_PER_PIXEL,
  dragCameraView,
  parseCameraView,
  ZOOM_MAX,
  ZOOM_MIN,
  zoomCameraView,
} from '../src/cameraView';

test('저장된 값이 없거나 깨졌으면 기본 시점이다', () => {
  expect(parseCameraView(null)).toEqual(DEFAULT_CAMERA_VIEW);
  expect(parseCameraView('not json')).toEqual(DEFAULT_CAMERA_VIEW);
  expect(parseCameraView('{"tilt": "high", "yaw": null, "zoom": "big"}')).toEqual(DEFAULT_CAMERA_VIEW);
});

test('저장된 각도는 ±30 도, 배율은 0.5 ~ 2.5 로 자른다', () => {
  expect(parseCameraView('{"tilt": 90, "yaw": -45, "zoom": 9}')).toEqual({ tilt: 30, yaw: -30, zoom: ZOOM_MAX });
  expect(parseCameraView('{"tilt": -12.5, "yaw": 8, "zoom": 0.1}')).toEqual({ tilt: -12.5, yaw: 8, zoom: ZOOM_MIN });
});

test('아래로 끌면 더 내려다보고, 오른쪽으로 끌면 맵이 오른쪽으로 돈다. 배율은 그대로다', () => {
  const start = { tilt: 10, yaw: 0, zoom: 1.5 };

  expect(dragCameraView(start, 0, 50)).toEqual({ tilt: 10 + 50 * DEGREES_PER_PIXEL, yaw: 0, zoom: 1.5 });
  expect(dragCameraView(start, 50, 0).yaw).toBe(-50 * DEGREES_PER_PIXEL);
});

test('끌어도 ±30 도를 넘지 않는다', () => {
  const start = { tilt: 0, yaw: 0, zoom: 1 };

  expect(dragCameraView(start, -1000, 1000)).toEqual({ tilt: 30, yaw: 30, zoom: 1 });
  expect(dragCameraView(start, 1000, -1000)).toEqual({ tilt: -30, yaw: -30, zoom: 1 });
});

test('배율은 곱해서 바꾸고 범위를 넘지 않는다. 각도는 그대로다', () => {
  const start = { tilt: 5, yaw: -5, zoom: 1 };

  expect(zoomCameraView(start, 1.5)).toEqual({ tilt: 5, yaw: -5, zoom: 1.5 });
  expect(zoomCameraView(start, 10).zoom).toBe(ZOOM_MAX);
  expect(zoomCameraView(start, 0.01).zoom).toBe(ZOOM_MIN);
});
