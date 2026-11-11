import type { StageDef } from '../data/maps';
import { stageTitle, t } from '../i18n';
import { el } from '../utils/dom';
import { createStageThumbnail } from './stageThumbnail';

/** 맵 선택. 맵마다 세로형 카드 하나를 전체 화면에 늘어놓는다. 썸네일은 처음 보일 때 맵 데이터로 그린다 */
export class MapSelect {
  readonly node = el('section', 'screen map-select');
  private _cards: HTMLButtonElement[] = [];
  private _drawn = false;

  constructor(
    private stages: StageDef[],
    onSelect: (index: number) => void,
    onBack: () => void
  ) {
    const header = el('header', 'map-header');
    const back = el('button', 'ui-button is-quiet', `← ${t('map.back')}`);
    back.type = 'button';
    back.addEventListener('click', onBack);
    header.append(back, el('h2', 'screen-title', t('map.heading')));

    const cards = el('div', 'map-cards');
    stages.forEach((stage, index) => {
      const card = el('button', 'map-card');
      card.type = 'button';
      card.append(
        el('div', 'map-thumbnail'),
        el('h3', 'map-title', stageTitle(stage.title)),
        el('p', 'map-length', t('map.length', { n: Math.round(stage.goalY) }))
      );
      card.addEventListener('click', () => onSelect(index));
      this._cards.push(card);
      cards.append(card);
    });
    this.node.append(header, cards);
  }

  /** 화면에 나올 때 부른다. selected 는 마지막으로 고른 맵 */
  show(selected: number) {
    if (!this._drawn) {
      this._drawn = true;
      this._cards.forEach((card, index) => {
        card.firstElementChild?.append(createStageThumbnail(this.stages[index]));
      });
    }
    this._cards.forEach((card, index) => {
      card.classList.toggle('is-selected', index === selected);
    });
    this._cards[selected]?.focus();
  }
}
