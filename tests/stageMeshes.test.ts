import { expect, test } from 'vitest';
import { StageMeshes } from '../src/render/three/stageMeshes';
import type { EntityShape, MapEntityState } from '../src/types/MapEntity.type';

function entity(shape: EntityShape, x = 0, y = 0, angle = 0): MapEntityState {
  return { x, y, angle, shape, life: -1 };
}

const wall: EntityShape = {
  type: 'polyline',
  rotation: 0,
  points: [
    [0, 0],
    [0, 5],
    [3, 9],
  ],
};
const box: EntityShape = { type: 'box', width: 1, height: 0.1, rotation: 0 };
const pin: EntityShape = { type: 'circle', radius: 0.3 };

test('엔티티마다 메시를 만들고 물리 상태를 옮긴다', () => {
  const meshes = new StageMeshes();
  meshes.sync([entity(wall), entity(box, 4, 7, 0.5), entity(pin, 2, 3)]);

  expect(meshes.group.children).toHaveLength(3);
  const boxMesh = meshes.group.children[1];
  expect(boxMesh.position.toArray()).toEqual([4, 7, 0]);
  expect(boxMesh.rotation.z).toBe(0.5);
});

test('같은 엔티티는 다음 프레임에 메시를 다시 만들지 않는다', () => {
  const meshes = new StageMeshes();
  meshes.sync([entity(wall), entity(box, 4, 7, 0)]);
  const before = [...meshes.group.children];

  meshes.sync([entity(wall), entity(box, 4, 7, 1.2)]);

  expect(meshes.group.children).toEqual(before);
  expect(before[1].rotation.z).toBe(1.2);
});

test('부서져 사라진 엔티티의 메시만 지운다', () => {
  const meshes = new StageMeshes();
  meshes.sync([entity(wall), entity(box), entity(pin)]);
  const [wallMesh, , pinMesh] = meshes.group.children;

  meshes.sync([entity(wall), entity(pin)]);

  expect(meshes.group.children).toEqual([wallMesh, pinMesh]);
});

test('맵을 다시 불러와 부서졌던 엔티티가 돌아오면 메시도 돌아온다', () => {
  const meshes = new StageMeshes();
  meshes.sync([entity(wall), entity(pin)]);

  meshes.sync([entity(wall), entity(box), entity(pin)]);

  expect(meshes.count).toBe(3);
  expect(meshes.group.children).toHaveLength(3);
});

test('다른 맵으로 바뀌면 메시를 전부 새로 만든다', () => {
  const meshes = new StageMeshes();
  meshes.sync([entity(wall), entity(box)]);
  const before = [...meshes.group.children];

  meshes.sync([entity({ ...pin })]);

  expect(meshes.group.children).toHaveLength(1);
  expect(before).not.toContain(meshes.group.children[0]);
});
