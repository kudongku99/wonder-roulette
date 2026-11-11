import { Vector3 } from 'three';
import { expect, test } from 'vitest';
import { GoalBurst } from '../src/goalBurst';
import { ConfettiMeshes, PARTICLES_PER_BURST } from '../src/render/three/confettiMeshes';

function positions(meshes: ConfettiMeshes) {
  return Array.from({ length: meshes.count }, (_, i) => meshes.getPosition(i, new Vector3()).toArray());
}

test('터진 직후에는 모든 조각이 골인한 자리에 있다', () => {
  const meshes = new ConfettiMeshes();
  meshes.sync([new GoalBurst(12, 100, 30)]);

  expect(meshes.count).toBe(PARTICLES_PER_BURST);
  for (const [x, y, z] of positions(meshes)) {
    expect(x).toBe(12);
    expect(y).toBe(100);
    expect(z).toBeCloseTo(0);
  }
});

test('시간이 지나면 조각이 위로 솟았다가 떨어진다', () => {
  const burst = new GoalBurst(12, 100, 30);
  const meshes = new ConfettiMeshes();

  burst.update(200);
  meshes.sync([burst]);
  const early = positions(meshes).map((p) => p[1]);
  expect(Math.max(...early)).toBeLessThan(100);

  burst.update(1800);
  meshes.sync([burst]);
  const late = positions(meshes).map((p) => p[1]);
  expect(late.filter((y) => y > 100).length).toBeGreaterThan(PARTICLES_PER_BURST / 2);
});

test('같은 효과는 다시 계산해도 같은 자리에 그려진다', () => {
  const burst = new GoalBurst(5, 50, 200);
  burst.update(500);
  const a = new ConfettiMeshes();
  const b = new ConfettiMeshes();
  a.sync([burst]);
  b.sync([burst]);

  expect(positions(a)).toEqual(positions(b));
});

test('효과가 끝나면 조각을 그리지 않는다', () => {
  const meshes = new ConfettiMeshes();
  meshes.sync([new GoalBurst(0, 0, 0), new GoalBurst(1, 1, 0)]);
  meshes.sync([]);

  expect(meshes.count).toBe(0);
});

test('수명이 다하면 사라질 대상이 된다', () => {
  const burst = new GoalBurst(0, 0, 0);
  burst.update(1000);
  expect(burst.isDestroy).toBe(false);
  burst.update(1500);
  expect(burst.isDestroy).toBe(true);
});
