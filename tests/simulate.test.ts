import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { collectGoals, type GoalRecord } from '../scripts/simulate';

const expected: GoalRecord[] = JSON.parse(
  readFileSync(new URL('./fixtures/simulate-goals.json', import.meta.url), 'utf8')
);

test('물리 시뮬레이션 결과가 원본(lazygyu/roulette e9a9d22)과 같다', async () => {
  const counts = [...new Set(expected.map((r) => r.n))];
  expect(await collectGoals(counts)).toEqual(expected);
});
