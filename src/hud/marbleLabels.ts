import { el, marbleColor } from '../utils/dom';
import type { HudFrame } from './hudFrame';

type LabelView = { node: HTMLElement; name: string; hue: number; leader: boolean; shown: boolean };

/**
 * 구슬 이름표. 요소를 만들어 두고 계속 다시 쓰며, 프레임마다 위치(transform) 만 바꾼다.
 * 글자, 색, 강조는 달라졌을 때만 고친다.
 */
export class MarbleLabels {
  readonly node = el('div', 'marble-labels');
  private _views: LabelView[] = [];

  /** @param width, height 이름표가 놓이는 영역의 크기 (CSS 픽셀) */
  update({ labels, marbles, winners }: HudFrame, width: number, height: number) {
    // 1등이 아직 안 나왔으면 선두 구슬을 강조한다
    const leader = winners.length === 0 ? marbles[0] : undefined;
    for (let i = 0; i < labels.length; i++) {
      const label = labels[i];
      const { marble } = label;
      const view = this._views[i] ?? this.createView();
      if (view.name !== marble.name) {
        view.name = marble.name;
        view.node.textContent = marble.name;
      }
      if (view.hue !== marble.hue) {
        view.hue = marble.hue;
        view.node.style.color = marbleColor(marble.hue);
      }
      const isLeader = marble === leader;
      if (view.leader !== isLeader) {
        view.leader = isLeader;
        view.node.classList.toggle('is-leader', isLeader);
      }
      if (!view.shown) {
        view.shown = true;
        view.node.hidden = false;
      }
      const x = label.x * width;
      const y = label.y * height + label.r * width;
      view.node.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translateX(-50%)`;
    }
    for (let i = labels.length; i < this._views.length; i++) {
      const view = this._views[i];
      if (!view.shown) break;
      view.shown = false;
      view.node.hidden = true;
    }
  }

  private createView(): LabelView {
    const node = el('div', 'marble-label');
    this.node.append(node);
    const view = { node, name: '', hue: -1, leader: false, shown: true };
    this._views.push(view);
    return view;
  }
}
