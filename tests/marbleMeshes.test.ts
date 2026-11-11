import { Matrix4, Vector3 } from 'three';
import { expect, test } from 'vitest';
import type { Marble } from '../src/marble';
import { MarbleMeshes } from '../src/render/three/marbleMeshes';

function marbles(count: number): Marble[] {
  return Array.from({ length: count }, (_, i) => ({
    name: `m${i}`,
    position: { x: i, y: i * 2, angle: 0 },
    hue: 0,
  })) as unknown as Marble[];
}

test('구슬 수만큼 인스턴스를 그리고 물리 위치를 옮긴다', () => {
  const meshes = new MarbleMeshes(0.25);
  meshes.sync(marbles(3));

  expect(meshes.instanceCount).toBe(3);
  const position = new Vector3().setFromMatrixPosition(meshes.getInstanceMatrix(2, new Matrix4()));
  expect(position.toArray()).toEqual([2, 4, 0]);
});

test('구슬이 용량을 넘으면 용량을 키운다', () => {
  const meshes = new MarbleMeshes(0.25);
  const initial = meshes.capacity;

  meshes.sync(marbles(initial));
  expect(meshes.capacity).toBe(initial);

  meshes.sync(marbles(1000));
  expect(meshes.capacity).toBeGreaterThanOrEqual(1000);
  expect(meshes.instanceCount).toBe(1000);
  expect(meshes.group.children).toHaveLength(1);
});

test('구슬이 줄면 남은 수만큼만 그린다', () => {
  const meshes = new MarbleMeshes(0.25);
  meshes.sync(marbles(10));
  meshes.sync(marbles(4));

  expect(meshes.instanceCount).toBe(4);
});
