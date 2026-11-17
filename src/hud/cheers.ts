import { t } from '../i18n';
import { CHEERS, CHEERS_PER_SECOND } from '../room/protocol';
import { el } from '../utils/dom';

/** 떠오른 응원이 사라지기까지의 시간 (ms). 스타일의 cheer-float 과 맞춘다 */
const FLOAT_MS = 2200;
/** 한꺼번에 떠 있을 수 있는 응원 수. 넘으면 오래된 것부터 지운다 */
const MAX_FLOATS = 40;

/**
 * 초대방의 응원. 화면 아래의 이모지 버튼을 누르면 방 안 모두의 화면에 그 이모지가 떠오른다.
 * 서버가 횟수를 제한하므로, 버려질 것은 여기서 먼저 보내지 않는다
 */
export class Cheers {
  readonly node = el('div', 'cheers');
  private _stage = el('div', 'cheer-stage');
  private _sent: number[] = [];

  /** @param onCheer 버튼을 눌렀을 때. 인자는 CHEERS 안의 순번이다 */
  constructor(onCheer: (emoji: number) => void) {
    const bar = el('div', 'cheer-bar');
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', t('hud.cheer'));
    CHEERS.forEach((emoji, index) => {
      const button = el('button', 'cheer-button', emoji);
      button.type = 'button';
      button.addEventListener('click', () => {
        const now = performance.now();
        this._sent = this._sent.filter((at) => now - at < 1000);
        if (this._sent.length >= CHEERS_PER_SECOND) return;
        this._sent.push(now);
        onCheer(index);
      });
      bar.append(button);
    });
    this._stage.setAttribute('aria-hidden', 'true');
    this.node.append(this._stage, bar);
  }

  /** 누군가 보낸 응원을 띄운다. name 은 보낸 사람의 닉네임이고 없으면 빈 글이다 */
  show(emoji: string, name: string) {
    const float = el('div', 'cheer-float');
    float.style.left = `${8 + Math.random() * 84}%`;
    float.append(el('span', 'cheer-emoji', emoji));
    if (name) float.append(el('span', 'cheer-name', name));
    this._stage.append(float);
    while (this._stage.childElementCount > MAX_FLOATS) this._stage.firstElementChild?.remove();
    window.setTimeout(() => float.remove(), FLOAT_MS);
  }
}
