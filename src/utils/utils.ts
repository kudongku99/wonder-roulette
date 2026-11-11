export const MAX_MARBLES = 100;

/** '이름' 또는 '이름*개수'. 이름이 비어 있으면 null */
export function parseName(nameStr: string) {
  const match = /^\s*([^*\s][^*]*?)\s*(?:\*\s*(\d+))?\s*$/.exec(nameStr);
  if (!match) return null;
  return { name: match[1], count: match[2] ? parseInt(match[2], 10) : 1 };
}

export type Member = { name: string; count: number };

/**
 * 입력 순서대로 구슬 수를 더해 가다가, 합계가 max 를 넘게 만드는 항목은 통째로 받지 않는다.
 * rejected 는 받지 않은 항목의 원래 문자열이다
 */
export function limitMembers(names: string[], max: number = MAX_MARBLES): { members: Member[]; rejected: string[] } {
  const members: Member[] = [];
  const rejected: string[] = [];
  let total = 0;
  for (const nameStr of names) {
    const member = parseName(nameStr);
    if (!member) continue;
    if (total + member.count > max) {
      rejected.push(nameStr);
      continue;
    }
    total += member.count;
    members.push(member);
  }
  return { members, rejected };
}

export function pad(v: number) {
  return v.toString().padStart(2, '0');
}

export function shuffle<T>(originalArray: T[]): T[] {
  const array = originalArray.slice();
  let currentIndex = array.length;
  let randomIndex;

  // While there remain elements to shuffle.
  while (currentIndex !== 0) {
    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }

  return array;
}
