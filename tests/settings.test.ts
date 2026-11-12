import { expect, test } from 'vitest';
import { DEFAULT_SETTINGS, parseSettings } from '../src/settings';

test('저장된 값이 없거나 깨졌으면 기본값이다', () => {
  expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
  expect(parseSettings('not json')).toEqual(DEFAULT_SETTINGS);
  expect(parseSettings('[1, 2]')).toEqual(DEFAULT_SETTINGS);
});

test('기울기는 -30 ~ 30 도로 자르고 정수로 맞춘다', () => {
  expect(parseSettings('{"tilt": 90}').tilt).toBe(30);
  expect(parseSettings('{"tilt": -45}').tilt).toBe(-30);
  expect(parseSettings('{"tilt": 12.6}').tilt).toBe(13);
  expect(parseSettings('{"tilt": "high"}').tilt).toBe(DEFAULT_SETTINGS.tilt);
});

test('항목마다 따로 읽어 잘못된 항목만 기본값으로 둔다', () => {
  expect(parseSettings('{"tilt": -10, "shadows": false, "bloom": "no"}')).toEqual({
    tilt: -10,
    shadows: false,
    bloom: true,
  });
});
