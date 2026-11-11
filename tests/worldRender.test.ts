import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { Canvas2dWorldRenderer } from '../src/render/canvas2dWorldRenderer';
import { type CallLog, createRecordingContext } from './helpers/recordingContext';
import { createWorldScene, SCENE_HEIGHT, SCENE_WIDTH, SKIN, SKIN_NAME } from './helpers/worldScene';

const expected: Record<string, CallLog> = JSON.parse(
  readFileSync(new URL('./fixtures/world-render-calls.json', import.meta.url), 'utf8')
);

test.each(['dark', 'light'] as const)('2D 월드 렌더러의 캔버스 호출이 분리 전과 같다 (%s 테마)', (themeName) => {
  const { winnerRange, ...scene } = createWorldScene(themeName);
  const { ctx, log } = createRecordingContext(SCENE_WIDTH, SCENE_HEIGHT);

  new Canvas2dWorldRenderer().render(ctx, {
    ...scene,
    winning: { first: winnerRange.start, last: winnerRange.end },
    skinOf: (name) => (name === SKIN_NAME ? SKIN : undefined),
  });

  expect(JSON.parse(JSON.stringify(log))).toEqual(expected[themeName]);
});
