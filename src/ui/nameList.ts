import { MAX_MARBLES, parseName } from '../utils/utils';

/** 이름 하나와 그 이름으로 넣을 구슬 수 */
export type NameEntry = { name: string; count: number };

export function totalCount(list: NameEntry[]): number {
  return list.reduce((sum, entry) => sum + entry.count, 0);
}

/**
 * 입력한 글을 이름 목록에 더한다. 쉼표나 줄바꿈으로 나눈 항목마다 '이름' 또는 '이름*개수' 로 읽고,
 * 이미 있는 이름이면 개수를 합친다. 총 구슬 수가 max 를 넘게 만드는 항목은 통째로 받지 않는다.
 * @returns 새 목록과 받지 않은 항목. 원래 목록은 고치지 않는다
 */
export function addNames(
  list: NameEntry[],
  text: string,
  max: number = MAX_MARBLES
): { list: NameEntry[]; rejected: string[] } {
  const next = list.map((entry) => ({ ...entry }));
  const rejected: string[] = [];
  let total = totalCount(next);
  for (const piece of text.split(/[,\r\n]/)) {
    const parsed = parseName(piece);
    if (!parsed || parsed.count < 1) continue;
    if (total + parsed.count > max) {
      rejected.push(piece.trim());
      continue;
    }
    total += parsed.count;
    const existing = next.find((entry) => entry.name === parsed.name);
    if (existing) existing.count += parsed.count;
    else next.push(parsed);
  }
  return { list: next, rejected };
}

export function removeName(list: NameEntry[], name: string): NameEntry[] {
  return list.filter((entry) => entry.name !== name);
}

/** 게임과 저장소에 넘기는 형태. 한 개면 '이름', 여러 개면 '이름*개수' */
export function toEntryStrings(list: NameEntry[]): string[] {
  return list.map((entry) => (entry.count > 1 ? `${entry.name}*${entry.count}` : entry.name));
}
