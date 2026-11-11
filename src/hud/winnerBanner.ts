import type { Marble } from '../marble';
import { el, marbleColor } from './dom';
import type { HudFrame } from './hudFrame';

/** 1등이 확정되면 나타나는 표시 */
export class WinnerBanner {
  readonly node = el('section', 'winner-banner');
  private _name = el('div', 'winner-name');
  private _shown: Marble | null = null;

  constructor() {
    this.node.hidden = true;
    this.node.append(el('div', 'winner-title', 'WINNER'), this._name);
  }

  update({ winner }: HudFrame) {
    if (winner === this._shown) return;
    this._shown = winner;
    this.node.hidden = !winner;
    if (!winner) return;
    this._name.textContent = winner.name;
    this.node.style.setProperty('--marble-color', marbleColor(winner.hue));
  }
}
