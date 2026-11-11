import { expect, test } from 'vitest';
import { limitMembers, parseName } from '../src/utils/utils';
import { zoomZoneIntensity } from '../src/zoomZone';

test('parseName 은 이름과 개수(*n)를 나눈다', () => {
  expect(parseName('수박')).toEqual({ name: '수박', count: 1 });
  expect(parseName(' 수박 * 2 ')).toEqual({ name: '수박', count: 2 });
  expect(parseName('*3')).toBeNull();
  expect(parseName('  ')).toBeNull();
});

test('가중치 문법은 없다. / 는 이름의 일부다', () => {
  expect(parseName('수박/3*2')).toEqual({ name: '수박/3', count: 2 });
});

test('limitMembers 는 합계가 상한을 넘게 만드는 항목을 통째로 받지 않는다', () => {
  expect(limitMembers(['a*98', 'b*3', 'c*2', 'd'])).toEqual({
    members: [
      { name: 'a', count: 98 },
      { name: 'c', count: 2 },
    ],
    rejected: ['b*3', 'd'],
  });
  expect(limitMembers(['a', 'b'], 1).rejected).toEqual(['b']);
});

test('zoomZoneIntensity 는 구역 가운데에서 1, 밖에서 0 이다', () => {
  const zones = [{ x: 10, y: 10, w: 4, h: 2 }];
  expect(zoomZoneIntensity(zones, 10, 10)).toBe(1);
  expect(zoomZoneIntensity(zones, 11, 10)).toBe(0.5);
  expect(zoomZoneIntensity(zones, 20, 10)).toBe(0);
});
