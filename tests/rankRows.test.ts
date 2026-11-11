import { expect, test } from 'vitest';
import { rankRows, rankTsv, resultColumns } from '../src/hud/rankRows';
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

test('모든 순위가 정해지면 골인하지 않은 구슬도 확정된 것으로 본다', () => {
  const [a, b] = ['a', 'b'].map(marble);

  expect(rankRows([a], [b], true).map((row) => row.finished)).toEqual([true, true]);
});

test('결과 화면은 구슬이 많을수록 열을 늘린다', () => {
  expect(resultColumns(6)).toBe(1);
  expect(resultColumns(30)).toBe(2);
  expect(resultColumns(60)).toBe(3);
  expect(resultColumns(100)).toBe(4);
});
