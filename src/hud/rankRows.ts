import type { Marble } from '../marble';

export type RankRow = { marble: Marble; rank: number; finished: boolean };

/**
 * 순위표의 행. 골인한 구슬이 골인한 순서로 먼저 오고, 달리는 구슬이 진행 순위대로 뒤따른다. rank 는 1 부터다.
 * @param settled 모든 순위가 정해졌으면 true. 아직 골인하지 않은 구슬도 순위가 확정된 것으로 본다
 */
export function rankRows(winners: Marble[], marbles: Marble[], settled = false): RankRow[] {
  const rows: RankRow[] = [];
  for (const marble of winners) rows.push({ marble, rank: rows.length + 1, finished: true });
  for (const marble of marbles) rows.push({ marble, rank: rows.length + 1, finished: settled });
  return rows;
}

/** 순위표를 표 계산 프로그램에 붙여 넣을 수 있는 글로 만든다 */
export function rankTsv(rows: RankRow[]): string {
  const lines = [['Rank', 'Name', 'Winner'].join('\t')];
  for (const row of rows) lines.push([row.rank, row.marble.name, row.rank === 1 ? '☆' : ''].join('\t'));
  return lines.join('\n');
}

/** 결과 화면에서 순위표를 몇 열로 나눌지. 행이 많을수록 열을 늘려 한 화면에 들어오게 한다 */
export function resultColumns(total: number): number {
  if (total > 70) return 4;
  if (total > 40) return 3;
  if (total > 15) return 2;
  return 1;
}

/** 이 수를 넘으면 결과 화면의 행을 작게 그린다 */
export const DENSE_RESULT_ROWS = 40;
