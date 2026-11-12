import { expect, test } from 'vitest';
import { DEFAULT_VIEW_ANGLE, DEGREES_PER_PIXEL, dragViewAngle, parseViewAngle } from '../src/viewAngle';

test('저장된 값이 없거나 깨졌으면 기본 각도다', () => {
  expect(parseViewAngle(null)).toEqual(DEFAULT_VIEW_ANGLE);
  expect(parseViewAngle('not json')).toEqual(DEFAULT_VIEW_ANGLE);
  expect(parseViewAngle('{"tilt": "high", "yaw": null}')).toEqual(DEFAULT_VIEW_ANGLE);
});

test('저장된 각도는 ±30 도로 자른다', () => {
  expect(parseViewAngle('{"tilt": 90, "yaw": -45}')).toEqual({ tilt: 30, yaw: -30 });
  expect(parseViewAngle('{"tilt": -12.5, "yaw": 8}')).toEqual({ tilt: -12.5, yaw: 8 });
});

test('아래로 끌면 더 내려다보고, 오른쪽으로 끌면 맵이 오른쪽으로 돈다', () => {
  const start = { tilt: 10, yaw: 0 };

  expect(dragViewAngle(start, 0, 50)).toEqual({ tilt: 10 + 50 * DEGREES_PER_PIXEL, yaw: 0 });
  expect(dragViewAngle(start, 50, 0).yaw).toBe(-50 * DEGREES_PER_PIXEL);
});

test('끌어도 ±30 도를 넘지 않는다', () => {
  expect(dragViewAngle({ tilt: 0, yaw: 0 }, -1000, 1000)).toEqual({ tilt: 30, yaw: 30 });
  expect(dragViewAngle({ tilt: 0, yaw: 0 }, 1000, -1000)).toEqual({ tilt: -30, yaw: -30 });
});
