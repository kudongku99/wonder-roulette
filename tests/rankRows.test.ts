import { expect, test } from 'vitest';
import { rankRows, rankTsv } from '../src/hud/rankRows';
import type { Marble } from '../src/marble';

const marble = (name: string) => ({ name }) as Marble;

test('골인한 구슬이 먼저, 달리는 구슬이 그 뒤에 이어서 순위를 받는다', () => {
  const [a, b, c] = ['a', 'b', 'c'].map(marble);

  expect(rankRows([a], [b, c])).toEqual([
    { marble: a, rank: 1, finished: true },
    { marble: b, rank: 2, finished: false },
    { marble: c, rank: 3, finished: false },
  ]);
});

test('복사용 글은 1등에만 표시를 붙인다', () => {
  const rows = rankRows([marble('a')], [marble('b')]);

  expect(rankTsv(rows)).toBe('Rank\tName\tWinner\n1\ta\t☆\n2\tb\t');
});
