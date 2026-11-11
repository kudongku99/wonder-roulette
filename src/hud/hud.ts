import { t } from '../i18n';
import type { VectorLike } from '../types/VectorLike';
import { el } from '../utils/dom';
import { Arrivals } from './arrivals';
import type { HudFrame } from './hudFrame';
import { MarbleLabels } from './marbleLabels';
import { Minimap } from './minimap';
import { RankBoard } from './rankBoard';
import { SpeedButton } from './speedButton';

const TOAST_LIFETIME = 1400;

/** HUD 가 바깥에 시키는 일 */
export type HudActions = {
  setFastForward(on: boolean): void;
  /** 카메라를 그 위치로 옮긴다. null 이면 다시 구슬을 따라간다 */
  lookAt(pos: VectorLike | null): void;
  /** 결과 화면의 다시 하기 */
  replay(): void;
  /** 결과 화면의 로비로 */
  toLobby(): void;
};

/**
 * 게임 화면 위에 겹치는 HTML HUD. 프레임마다 update 로 게임 상태를 받아 그린다.
 * 루트는 클릭을 통과시키고, 누를 수 있는 부분만 따로 받는다.
 */
export class Hud {
  readonly node = el('div', 'hud');
  private _labels = new MarbleLabels();
  private _minimap: Minimap;
  private _rank: RankBoard;
  private _arrivals = new Arrivals();
  private _width = 0;
  private _height = 0;
  private _result = false;

  constructor(parent: HTMLElement, actions: HudActions) {
    this._minimap = new Minimap(actions.lookAt);
    this._rank = new RankBoard({
      onCopy: () => this.toast(t('hud.copied')),
      onReplay: actions.replay,
      onLobby: actions.toLobby,
    });
    const speed = new SpeedButton(t('hud.fastForward'), actions.setFastForward);
    this.node.append(this._labels.node, this._minimap.node, this._arrivals.node, speed.node, this._rank.node);
    parent.append(this.node);

    new ResizeObserver(([entry]) => {
      this._width = entry.contentRect.width;
      this._height = entry.contentRect.height;
    }).observe(this.node);
  }

  /** 게임 화면이 아닐 때는 숨긴다. 숨긴 동안에는 갱신하지 않는다 */
  setVisible(visible: boolean) {
    this.node.hidden = !visible;
  }

  update(frame: HudFrame) {
    if (this.node.hidden || this._width === 0) return;
    const result = !!frame.winner;
    if (result !== this._result) {
      this._result = result;
      this.node.classList.toggle('is-result', result);
    }
    this._labels.update(frame, this._width, this._height);
    this._minimap.update(frame, this._height);
    this._rank.update(frame);
    this._arrivals.update(frame);
  }

  private toast(message: string) {
    const node = el('div', 'hud-toast', message);
    this.node.append(node);
    window.setTimeout(() => node.remove(), TOAST_LIFETIME);
  }
}
