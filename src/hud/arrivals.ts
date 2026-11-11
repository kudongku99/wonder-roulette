import { el, marbleColor } from '../utils/dom';
import type { HudFrame } from './hudFrame';

/** 한 번에 보여주는 알림 수. 넘으면 오래된 것부터 지운다 */
const MAX_VISIBLE = 4;
/** 알림 하나가 떠 있는 시간 (ms). 스타일의 사라지는 애니메이션 길이와 맞춘다 */
const LIFETIME = 2600;

/** 구슬이 골인할 때마다 잠깐 뜨는 도착 알림 */
export class Arrivals {
  readonly node = el('div', 'arrivals');
  private _seen = 0;

  update({ winners }: HudFrame) {
    // 새 판이 시작되면 골인한 구슬이 줄어든다
    if (winners.length < this._seen) {
      this._seen = winners.length;
      this.node.replaceChildren();
      return;
    }
    while (this._seen < winners.length) {
      const marble = winners[this._seen++];
      const item = el('div', 'arrival');
      const name = el('span', 'arrival-name', marble.name);
      name.style.color = marbleColor(marble.hue);
      item.append(el('span', 'arrival-rank', `#${this._seen}`), name);
      this.node.append(item);
      window.setTimeout(() => item.remove(), LIFETIME);
    }
    while (this.node.childElementCount > MAX_VISIBLE) this.node.firstElementChild?.remove();
  }
}
