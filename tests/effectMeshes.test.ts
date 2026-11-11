import { expect, test } from 'vitest';
import { Themes } from '../src/data/constants';
import { EffectMeshes } from '../src/render/three/effectMeshes';
import { SkillEffect } from '../src/skillEffect';

test('이펙트마다 고리를 그리고 진행에 따라 키우며 흐리게 한다', () => {
  const effect = new SkillEffect(3, 7);
  effect.update(250);
  const meshes = new EffectMeshes();
  meshes.sync([effect], Themes.dark);

  const ring = meshes.group.children[0] as any;
  expect(ring.position.toArray()).toEqual([3, 7, 0]);
  expect(ring.scale.x).toBe(effect.size);
  expect(ring.material.opacity).toBeCloseTo(0.75);
});

test('끝난 이펙트의 고리는 숨긴다', () => {
  const meshes = new EffectMeshes();
  meshes.sync([new SkillEffect(0, 0), new SkillEffect(1, 1)], Themes.dark);
  meshes.sync([new SkillEffect(0, 0)], Themes.dark);

  expect(meshes.visibleCount).toBe(1);
});
