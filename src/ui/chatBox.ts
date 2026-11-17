import { t } from '../i18n';
import { el } from '../utils/dom';
import { bindChatInput } from './chatInput';

/** 대화 목록에 남겨 두는 줄 수. 넘으면 오래된 줄부터 지운다 */
const MAX_LINES = 200;
/** 맨 아래에서 이만큼(px) 안쪽이면 맨 아래를 보고 있는 것으로 본다 */
const STICK_PX = 24;

/**
 * 대기실의 대화 목록과 입력창. 새 글이 오면 맨 아래를 따라가지만,
 * 사용자가 위로 올려 보는 동안에는 멈춘다
 */
export class ChatBox {
  readonly node = el('div', 'chat-box');
  private _list = el('ul', 'chat-list');
  private _input = el('input', 'lobby-input chat-input');
  private _stick = true;

  constructor(onSend: (text: string) => void) {
    this._list.setAttribute('role', 'log');
    this._list.setAttribute('aria-label', t('chat.label'));
    this._list.addEventListener('scroll', () => {
      this._stick = this._list.scrollHeight - this._list.scrollTop - this._list.clientHeight <= STICK_PX;
    });
    bindChatInput(this._input, onSend);
    this._input.setAttribute('aria-label', t('chat.label'));
    this.setEnabled(false);
    this.node.append(this._list, this._input);
  }

  setEnabled(enabled: boolean) {
    this._input.disabled = !enabled;
    this._input.placeholder = t(enabled ? 'chat.placeholder' : 'chat.needNickname');
  }

  clear() {
    this._list.replaceChildren();
    this._stick = true;
  }

  add(name: string, text: string, mine: boolean) {
    const line = el('li', 'chat-line');
    line.classList.toggle('is-mine', mine);
    line.append(el('span', 'chat-name', name), el('span', 'chat-text', text));
    this._list.append(line);
    while (this._list.childElementCount > MAX_LINES) this._list.firstElementChild?.remove();
    if (this._stick || mine) {
      this._stick = true;
      this._list.scrollTop = this._list.scrollHeight;
    }
  }
}
