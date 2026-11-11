import type { Marble } from '../marble';

export type RankRow = { marble: Marble; rank: number; finished: boolean };

/** 순위표의 행. 골인한 구슬이 골인한 순서로 먼저 오고, 달리는 구슬이 진행 순위대로 뒤따른다. rank 는 1 부터다 */
export function rankRows(winners: Marble[], marbles: Marble[]): RankRow[] {
  const rows: RankRow[] = [];
  for (const marble of winners) rows.push({ marble, rank: rows.length + 1, finished: true });
  for (const marble of marbles) rows.push({ marble, rank: rows.length + 1, finished: false });
  return rows;
}

/** 순위표를 표 계산 프로그램에 붙여 넣을 수 있는 글로 만든다 */
export function rankTsv(rows: RankRow[]): string {
  const lines = [['Rank', 'Name', 'Winner'].join('\t')];
  for (const row of rows) lines.push([row.rank, row.marble.name, row.rank === 1 ? '☆' : ''].join('\t'));
  return lines.join('\n');
}
