import { t } from '../i18n';
import { el } from '../utils/dom';

export type GameControlActions = {
  toMaps(): void;
  shuffle(): void;
  start(): void;
};

/** 게임 화면에서 시작 전에만 보이는 버튼들. 맵을 가리지 않게 화면 아래 가운데에 둔다 */
export class GameControls {
  readonly node = el('div', 'game-controls');
  private _start = el('button', 'ui-button is-primary is-large', t('game.start'));

  constructor(actions: GameControlActions) {
    const maps = el('button', 'ui-button', `← ${t('game.maps')}`);
    const shuffle = el('button', 'ui-button', t('game.shuffle'));
    for (const button of [maps, shuffle, this._start]) button.type = 'button';
    maps.addEventListener('click', actions.toMaps);
    shuffle.addEventListener('click', actions.shuffle);
    this._start.addEventListener('click', actions.start);
    this.node.append(maps, shuffle, this._start);
  }

  focus() {
    this._start.focus();
  }
}
