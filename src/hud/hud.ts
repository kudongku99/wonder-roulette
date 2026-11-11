import { translate } from '../localization';
import type { VectorLike } from '../types/VectorLike';
import { Arrivals } from './arrivals';
import { el } from './dom';
import type { HudFrame } from './hudFrame';
import { MarbleLabels } from './marbleLabels';
import { Minimap } from './minimap';
import { RankBoard } from './rankBoard';
import { SpeedButton } from './speedButton';
import { WinnerBanner } from './winnerBanner';

const TOAST_LIFETIME = 1400;

/** HUD 가 게임에 시키는 일 */
export type HudActions = {
  setFastForward(on: boolean): void;
  /** 카메라를 그 위치로 옮긴다. null 이면 다시 구슬을 따라간다 */
  lookAt(pos: VectorLike | null): void;
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
  private _winner = new WinnerBanner();
  private _arrivals = new Arrivals();
  private _width = 0;
  private _height = 0;

  constructor(parent: HTMLElement, actions: HudActions) {
    this._minimap = new Minimap(actions.lookAt);
    this._rank = new RankBoard(() => this.toast(translate('The result has been copied')));
    const speed = new SpeedButton(translate('Fast forward'), actions.setFastForward);
    this.node.append(
      this._labels.node,
      this._minimap.node,
      this._rank.node,
      this._arrivals.node,
      speed.node,
      this._winner.node
    );
    parent.append(this.node);

    new ResizeObserver(([entry]) => {
      this._width = entry.contentRect.width;
      this._height = entry.contentRect.height;
    }).observe(this.node);
    const rect = this.node.getBoundingClientRect();
    this._width = rect.width;
    this._height = rect.height;
  }

  update(frame: HudFrame) {
    this._labels.update(frame, this._width, this._height);
    this._minimap.update(frame, this._height);
    this._rank.update(frame);
    this._winner.update(frame);
    this._arrivals.update(frame);
  }

  private toast(message: string) {
    const node = el('div', 'hud-toast', message);
    this.node.append(node);
    window.setTimeout(() => node.remove(), TOAST_LIFETIME);
  }
}
