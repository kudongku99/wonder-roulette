import type { Marble } from '../marble';
import { el, marbleColor } from './dom';
import type { HudFrame } from './hudFrame';
import { rankRows, rankTsv } from './rankRows';

/** 사용자가 목록을 직접 움직인 뒤 이 시간(ms) 동안은 자동으로 따라가지 않는다 */
const USER_SCROLL_HOLD = 2000;

type RowView = { node: HTMLElement; rankNode: HTMLElement; rank: number; finished: boolean };

/**
 * 순위표. 구슬마다 행 하나를 계속 쓰고, 순위나 골인 여부가 바뀐 행만 고친다.
 * 행의 순서는 DOM 순서가 아니라 CSS order 로 정한다.
 */
export class RankBoard {
  readonly node = el('section', 'hud-panel rank-board');
  private _count = el('div', 'rank-count');
  private _list = el('ol', 'rank-list');
  private _rows = new Map<Marble, RowView>();
  private _finished = -1;
  private _userScrolledAt = 0;
  private _tsv = '';

  /** @param onCopy 순위표를 복사했을 때 부른다 */
  constructor(onCopy: () => void) {
    this.node.append(this._count, this._list);
    const hold = () => {
      this._userScrolledAt = performance.now();
    };
    this._list.addEventListener('wheel', hold, { passive: true });
    this._list.addEventListener('touchmove', hold, { passive: true });
    this.node.addEventListener('dblclick', () => {
      navigator.clipboard?.writeText(this._tsv).then(onCopy);
    });
  }

  update({ winners, marbles }: HudFrame) {
    const rows = rankRows(winners, marbles);
    let changed = rows.length !== this._rows.size;
    for (const row of rows) {
      let view = this._rows.get(row.marble);
      if (!view) {
        view = this.createRow(row.marble);
        changed = true;
      }
      if (view.rank !== row.rank || view.finished !== row.finished) {
        view.rank = row.rank;
        view.finished = row.finished;
        view.node.style.order = String(row.rank);
        view.node.classList.toggle('is-finished', row.finished);
        view.node.classList.toggle('is-first', row.finished && row.rank === 1);
        view.rankNode.textContent = `#${row.rank}`;
        changed = true;
      }
    }
    if (!changed) return;

    if (this._rows.size > rows.length) {
      const alive = new Set(rows.map((row) => row.marble));
      for (const [marble, view] of this._rows) {
        if (alive.has(marble)) continue;
        view.node.remove();
        this._rows.delete(marble);
      }
    }
    this._count.textContent = `${winners.length} / ${rows.length}`;
    this._tsv = rankTsv(rows);

    if (winners.length !== this._finished) {
      this._finished = winners.length;
      this.follow(rows.length);
    }
  }

  private createRow(marble: Marble): RowView {
    const node = el('li', 'rank-row');
    const rankNode = el('span', 'rank-number');
    const name = el('span', 'rank-name', marble.name);
    name.style.color = marbleColor(marble.hue);
    node.append(rankNode, name);
    this._list.append(node);
    const view = { node, rankNode, rank: 0, finished: false };
    this._rows.set(marble, view);
    return view;
  }

  /** 방금 골인한 순위 근처가 보이도록 목록을 움직인다 */
  private follow(total: number) {
    if (performance.now() - this._userScrolledAt < USER_SCROLL_HOLD) return;
    const list = this._list;
    const rowHeight = total > 0 ? list.scrollHeight / total : 0;
    list.scrollTo({ top: this._finished * rowHeight - list.clientHeight / 2, behavior: 'smooth' });
  }
}
