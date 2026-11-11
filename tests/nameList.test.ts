import { expect, test } from 'vitest';
import { addNames, removeName, toEntryStrings, totalCount } from '../src/ui/nameList';

test('엔터 한 번에 이름 하나를 더한다', () => {
  const { list, rejected } = addNames([], '철수');

  expect(list).toEqual([{ name: '철수', count: 1 }]);
  expect(rejected).toEqual([]);
});

test('쉼표나 줄바꿈으로 나뉜 여러 이름을 한 번에 받고 개수 문법을 읽는다', () => {
  const { list } = addNames([], '철수, 영희*3\n민수\r\n , ');

  expect(list).toEqual([
    { name: '철수', count: 1 },
    { name: '영희', count: 3 },
    { name: '민수', count: 1 },
  ]);
  expect(totalCount(list)).toBe(5);
});

test('이미 있는 이름은 개수를 합치고 원래 목록은 고치지 않는다', () => {
  const before = [{ name: '철수', count: 1 }];
  const { list } = addNames(before, '철수*2,철수');

  expect(list).toEqual([{ name: '철수', count: 4 }]);
  expect(before).toEqual([{ name: '철수', count: 1 }]);
});

test('총 구슬 수가 상한을 넘게 만드는 항목은 통째로 받지 않는다', () => {
  const { list, rejected } = addNames([{ name: 'a', count: 98 }], 'b*3, c*2, d');

  expect(list).toEqual([
    { name: 'a', count: 98 },
    { name: 'c', count: 2 },
  ]);
  expect(rejected).toEqual(['b*3', 'd']);
});

test('개수가 0 인 항목은 버린다', () => {
  expect(addNames([], 'a*0').list).toEqual([]);
});

test('이름을 지우고, 게임에 넘길 글로 바꾼다', () => {
  const list = [
    { name: 'a', count: 1 },
    { name: 'b', count: 3 },
  ];

  expect(toEntryStrings(list)).toEqual(['a', 'b*3']);
  expect(removeName(list, 'a')).toEqual([{ name: 'b', count: 3 }]);
});
