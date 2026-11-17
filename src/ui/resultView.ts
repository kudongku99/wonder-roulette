import { t } from '../i18n';
import type { SharedResult } from '../room/protocol';
import { el } from '../utils/dom';

/**
 * 결과 링크(`?result=코드-판`) 로 들어왔을 때 보여 주는 화면. 초대방에서 끝난 한 판의 순위표다.
 * 서버에 남아 있는 이름과 순위만 보여 주고, 경기를 다시 돌리지는 않는다.
 */
export class ResultView {
  readonly node = el('section', 'screen shared');
  private _message = el('p', 'shared-message', t('shared.loading'));
  private _winner = el('div', 'shared-winner');
  private _meta = el('p', 'shared-meta');
  private _list = el('ol', 'shared-list');

  /** @param onLobby 로비로 버튼을 눌렀을 때 */
  constructor(onLobby: () => void) {
    const card = el('div', 'ui-panel shared-card');
    const lobby = el('button', 'ui-button is-primary', t('result.lobby'));
    lobby.type = 'button';
    lobby.addEventListener('click', onLobby);
    this._message.setAttribute('role', 'status');
    card.append(
      el('h2', 'screen-title', t('shared.heading')),
      this._message,
      this._winner,
      this._meta,
      this._list,
      lobby
    );
    this.node.append(card);
    this.show(null, '');
  }

  /**
   * @param result 보여 줄 결과. 찾지 못했으면 null
   * @param mapTitle 그 판의 맵 이름
   */
  show(result: SharedResult | null, mapTitle: string) {
    this._message.hidden = !!result;
    this._winner.hidden = this._meta.hidden = this._list.hidden = !result;
    if (!result) return;
    this._winner.replaceChildren(
      el('span', 'shared-winner-title', 'WINNER'),
      el('span', 'shared-winner-name', result.names[0])
    );
    this._meta.textContent = `${mapTitle} · ${new Date(result.at).toLocaleString()}`;
    this._list.replaceChildren(
      ...result.names.map((name, index) => {
        const row = el('li', 'shared-row');
        row.append(el('span', 'shared-rank', `#${index + 1}`), el('span', 'shared-name', name));
        return row;
      })
    );
  }

  /** 결과를 찾지 못했다고 알린다 */
  missing() {
    this.show(null, '');
    this._message.textContent = t('shared.missing');
  }
}
