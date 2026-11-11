import { Matrix4, Vector3 } from 'three';
import { expect, test } from 'vitest';
import { Themes } from '../src/data/constants';
import type { Marble } from '../src/marble';
import { MarbleMeshes } from '../src/render/three/marbleMeshes';

function marbles(count: number): Marble[] {
  return Array.from({ length: count }, (_, i) => ({
    name: `m${i}`,
    position: { x: i, y: i * 2, angle: 0 },
    hue: 0,
    impact: 0,
  })) as unknown as Marble[];
}

const SKIN = {} as CanvasImageSource;

test('구슬 수만큼 인스턴스를 그리고 물리 위치를 옮긴다', () => {
  const meshes = new MarbleMeshes(0.25);
  meshes.sync(marbles(3), Themes.dark);

  expect(meshes.instanceCount).toBe(3);
  const position = new Vector3().setFromMatrixPosition(meshes.getInstanceMatrix(2, new Matrix4()));
  expect(position.toArray()).toEqual([2, 4, 0]);
});

test('구슬이 용량을 넘으면 용량을 키운다', () => {
  const meshes = new MarbleMeshes(0.25);
  const initial = meshes.capacity;

  meshes.sync(marbles(initial), Themes.dark);
  expect(meshes.capacity).toBe(initial);

  meshes.sync(marbles(1000), Themes.dark);
  expect(meshes.capacity).toBeGreaterThanOrEqual(1000);
  expect(meshes.instanceCount).toBe(1000);
  expect(meshes.group.children).toHaveLength(1);
});

test('구슬이 줄면 남은 수만큼만 그린다', () => {
  const meshes = new MarbleMeshes(0.25);
  meshes.sync(marbles(10), Themes.dark);
  meshes.sync(marbles(4), Themes.dark);

  expect(meshes.instanceCount).toBe(4);
});

test('스킨이 있는 구슬은 인스턴스에서 빼고 따로 그린다', () => {
  const meshes = new MarbleMeshes(0.25);
  meshes.sync(marbles(5), Themes.dark, (name) => (name === 'm1' || name === 'm3' ? SKIN : undefined));

  expect(meshes.instanceCount).toBe(3);
  expect(meshes.skinnedCount).toBe(2);
  const position = new Vector3().setFromMatrixPosition(meshes.getInstanceMatrix(1, new Matrix4()));
  expect(position.toArray()).toEqual([2, 4, 0]);
});

test('스킨 구슬이 골인해 사라지면 그 메시를 숨긴다', () => {
  const meshes = new MarbleMeshes(0.25);
  meshes.sync(marbles(3), Themes.dark, () => SKIN);
  meshes.sync(marbles(1), Themes.dark, () => SKIN);

  expect(meshes.skinnedCount).toBe(1);
});
