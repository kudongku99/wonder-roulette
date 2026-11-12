import { expect, test } from 'vitest';
import type { StageDef } from '../src/data/maps';
import { stages } from '../src/data/maps';
import { ProgressMap } from '../src/progressMap';
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

test('구슬이 다니는 칸은 출발점에서 이어지고 결승선 아래 여백으로 새지 않는다', () => {
  const stage = stages[0];
  const map = ProgressMap.for(stage);
  const mask = map.reachableFrom([[12, 1]]);
  const at = (x: number, y: number) =>
    mask[Math.round((y - map.minY) / map.cellSize) * map.cols + Math.round((x - map.minX) / map.cellSize)];

  expect(at(12, 1)).toBe(1);
  // 출발 통로 위쪽과 맵 둘레의 여백은 바깥이다
  expect(at(12, map.minY + 0.5)).toBe(0);
  expect(at(map.minX + 0.25, stage.goalY + 0.5)).toBe(0);
});
