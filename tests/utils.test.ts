import { expect, test } from 'vitest';
import { parseName } from '../src/utils/utils';
import { zoomZoneIntensity } from '../src/zoomZone';

test('parseName 은 이름, 가중치(/n), 개수(*n)를 나눈다', () => {
  expect(parseName('수박')).toEqual({ name: '수박', weight: 1, count: 1 });
  expect(parseName('수박/3*2')).toEqual({ name: '수박', weight: 3, count: 2 });
});

test('zoomZoneIntensity 는 구역 가운데에서 1, 밖에서 0 이다', () => {
  const zones = [{ x: 10, y: 10, w: 4, h: 2 }];
  expect(zoomZoneIntensity(zones, 10, 10)).toBe(1);
  expect(zoomZoneIntensity(zones, 11, 10)).toBe(0.5);
  expect(zoomZoneIntensity(zones, 20, 10)).toBe(0);
});
