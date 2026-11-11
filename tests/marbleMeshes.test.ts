import { Matrix4, Vector3 } from 'three';
import { expect, test } from 'vitest';
import { Themes } from '../src/data/constants';
import type { Marble } from '../src/marble';
import { MarbleMeshes } from '../src/render/three/marbleMeshes';

function marbles(count: number): Marble[] {
  return Array.from({ length: count }, (_, i) => ({
    position: { x: i, y: i * 2, angle: 0 },
    hue: 0,
    impact: 0,
  })) as unknown as Marble[];
}

test('구슬 수만큼 인스턴스를 그리고 물리 위치를 옮긴다', () => {
  const meshes = new MarbleMeshes(0.25);
  meshes.sync(marbles(3), Themes.dark);

  expect(meshes.mesh.count).toBe(3);
  const matrix = new Matrix4();
  meshes.mesh.getMatrixAt(2, matrix);
  expect(new Vector3().setFromMatrixPosition(matrix).toArray()).toEqual([2, 4, 0]);
});

test('구슬이 용량을 넘으면 메시를 키워 새로 만든다', () => {
  const meshes = new MarbleMeshes(0.25);
  const first = meshes.mesh;

  expect(meshes.sync(marbles(first.instanceMatrix.count), Themes.dark)).toBe(false);
  expect(meshes.sync(marbles(1000), Themes.dark)).toBe(true);

  expect(meshes.mesh).not.toBe(first);
  expect(meshes.capacity).toBeGreaterThanOrEqual(1000);
  expect(meshes.mesh.count).toBe(1000);
});

test('구슬이 줄면 남은 수만큼만 그린다', () => {
  const meshes = new MarbleMeshes(0.25);
  meshes.sync(marbles(10), Themes.dark);
  meshes.sync(marbles(4), Themes.dark);

  expect(meshes.mesh.count).toBe(4);
});
