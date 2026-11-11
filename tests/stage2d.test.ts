import { expect, test } from 'vitest';
import type { StageDef } from '../src/data/maps';
import { stages } from '../src/data/maps';
import { stageRangeX } from '../src/render/stage2d';
import type { MapEntity } from '../src/types/MapEntity.type';

const props = { density: 1, restitution: 0, angularVelocity: 0 };

function stageWith(...entities: MapEntity[]): StageDef {
  return { title: 'test', goalY: 100, zoomY: 90, entities };
}

test('장애물이 기본 범위 안에 있으면 기본 범위 그대로다', () => {
  const stage = stageWith({
    type: 'static',
    position: { x: 10, y: 5 },
    shape: { type: 'circle', radius: 1 },
    props,
  });

  expect(stageRangeX(stage)).toEqual({ minX: 0, maxX: 26 });
});

test('세로로 긴 고정 벽은 두께만큼만 가로를 차지한다', () => {
  const stage = stageWith({
    type: 'static',
    position: { x: 2, y: 0 },
    shape: { type: 'box', width: 1, height: 800, rotation: 0 },
    props,
  });

  expect(stageRangeX(stage)).toEqual({ minX: 0, maxX: 26 });
});

test('도는 박스는 대각선 길이만큼 넓혀 잡는다', () => {
  const stage = stageWith({
    type: 'kinematic',
    position: { x: 13, y: 10 },
    shape: { type: 'box', width: 30, height: 40, rotation: 0 },
    props,
  });

  expect(stageRangeX(stage)).toEqual({ minX: -37, maxX: 63 });
});

test('기본 맵은 모두 가로 범위가 기본 범위에서 크게 벗어나지 않는다', () => {
  for (const stage of stages) {
    const { minX, maxX } = stageRangeX(stage);
    expect(maxX - minX).toBeLessThanOrEqual(30);
  }
});
