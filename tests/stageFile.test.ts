import { expect, test } from 'vitest';
import { stages } from '../src/data/maps';
import { isPlayableStage, parseStageFile } from '../src/stageFile';

const minimal = {
  title: 'mini',
  goalY: 20,
  zoomY: 15,
  entities: [
    {
      type: 'static',
      position: { x: 0, y: 0 },
      shape: { type: 'box', width: 1, height: 1, rotation: 0 },
      props: { density: 1, restitution: 0, angularVelocity: 0 },
    },
  ],
};

test('기본 맵은 모두 불러올 수 있는 형태다', () => {
  for (const stage of stages) {
    expect(isPlayableStage(JSON.parse(JSON.stringify(stage)))).toBe(true);
  }
});

test('맵 그 자체와 stage 필드에 담긴 꾸러미를 모두 읽는다', () => {
  expect(parseStageFile(JSON.stringify(minimal))?.title).toBe('mini');
  expect(parseStageFile(JSON.stringify({ id: 'abc', author: 'me', stage: minimal }))?.title).toBe('mini');
});

test('JSON 이 아니거나 형태가 맞지 않으면 null 이다', () => {
  expect(parseStageFile('not json')).toBeNull();
  expect(parseStageFile(JSON.stringify({ ...minimal, entities: [] }))).toBeNull();
  expect(parseStageFile(JSON.stringify({ ...minimal, goalY: 'far' }))).toBeNull();
  expect(
    parseStageFile(
      JSON.stringify({ ...minimal, entities: [{ ...minimal.entities[0], shape: { type: 'circle', radius: 0 } }] })
    )
  ).toBeNull();
});
