import { t } from '../i18n';
import type { Marble } from '../marble';
import { el, marbleColor } from '../utils/dom';
import type { HudFrame } from './hudFrame';
import { DENSE_RESULT_ROWS, rankRows, rankTsv, resultColumns } from './rankRows';

/** 사용자가 목록을 직접 움직인 뒤 이 시간(ms) 동안은 자동으로 따라가지 않는다 */
const USER_SCROLL_HOLD = 2000;

type RowView = { node: HTMLElement; rankNode: HTMLElement; rank: number; finished: boolean };

export type RankBoardActions = {
  /** 순위표를 복사했을 때 */
  onCopy(): void;
  onReplay(): void;
  onLobby(): void;
};

/**
 * 순위표. 구슬마다 행 하나를 계속 쓰고, 순위나 골인 여부가 바뀐 행만 고친다.
 * 행의 순서는 DOM 순서가 아니라 CSS order 로 정한다.
 * 1등이 확정되면 화면 가운데로 커져 결과 화면이 된다(is-result). 아직 골인하지 않은 행은 반투명하게 두고
 * 진행 순위대로 움직이며, 골인하면 불투명해지고 자리가 굳는다.
 */
export class RankBoard {
  readonly node = el('section', 'hud-panel rank-board');
  private _winnerName = el('div', 'rank-winner-name');
  private _winner = el('header', 'rank-winner');
  private _count = el('div', 'rank-count');
  private _list = el('ol', 'rank-list');
  private _actions = el('footer', 'rank-actions');
  private _rows = new Map<Marble, RowView>();
  private _finished = -1;
  private _total = -1;
  private _shownWinner: Marble | null = null;
  private _userScrolledAt = 0;
  private _tsv = '';

  constructor(actions: RankBoardActions) {
    this._winner.append(el('div', 'rank-winner-title', 'WINNER'), this._winnerName);
    this._winner.hidden = true;

    const replay = el('button', 'ui-button is-primary', t('result.replay'));
    const lobby = el('button', 'ui-button', t('result.lobby'));
    replay.type = 'button';
    lobby.type = 'button';
    replay.addEventListener('click', actions.onReplay);
    lobby.addEventListener('click', actions.onLobby);
    this._actions.append(replay, lobby);
    this._actions.hidden = true;

    this.node.append(this._winner, this._count, this._list, this._actions);
    const hold = () => {
      this._userScrolledAt = performance.now();
    };
    this._list.addEventListener('wheel', hold, { passive: true });
    this._list.addEventListener('touchmove', hold, { passive: true });
    this._list.addEventListener('dblclick', () => {
      navigator.clipboard?.writeText(this._tsv).then(actions.onCopy);
    });
  }

  update({ winners, marbles, winner, finished }: HudFrame) {
    this.showWinner(winner);

    const rows = rankRows(winners, marbles, finished);
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
    this._count.textContent = `${finished ? rows.length : winners.length} / ${rows.length}`;
    this._tsv = rankTsv(rows);

    if (rows.length !== this._total) {
      this._total = rows.length;
      const columns = resultColumns(rows.length);
      this.node.style.setProperty('--result-columns', String(columns));
      this.node.style.setProperty('--result-rows', String(Math.ceil(rows.length / columns)));
      this.node.classList.toggle('is-dense', rows.length > DENSE_RESULT_ROWS);
    }
    if (winners.length !== this._finished) {
      this._finished = winners.length;
      this.follow(rows.length);
    }
  }

  private showWinner(winner: Marble | null) {
    if (winner === this._shownWinner) return;
    this._shownWinner = winner;
    this.node.classList.toggle('is-result', !!winner);
    this._winner.hidden = !winner;
    this._actions.hidden = !winner;
    this._list.scrollTop = 0;
    if (!winner) return;
    this._winnerName.textContent = winner.name;
    this._winnerName.style.color = marbleColor(winner.hue);
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

  /** 방금 골인한 순위 근처가 보이도록 목록을 움직인다. 결과 화면에서는 여러 열이라 움직이지 않는다 */
  private follow(total: number) {
    if (this._shownWinner) return;
    if (performance.now() - this._userScrolledAt < USER_SCROLL_HOLD) return;
    const list = this._list;
    const rowHeight = total > 0 ? list.scrollHeight / total : 0;
    list.scrollTo({ top: this._finished * rowHeight - list.clientHeight / 2, behavior: 'smooth' });
  }
}
