import { t } from '../i18n';
import { bindChatInput } from '../ui/chatInput';
import { el } from '../utils/dom';

/** 말풍선이 떠 있는 시간 (ms) */
const BUBBLE_MS = 6000;
/** 한꺼번에 떠 있을 수 있는 말풍선 수. 넘으면 오래된 것부터 지운다 */
const MAX_BUBBLES = 5;

/** 경기 화면의 채팅. 입력창 하나와, 잠깐 떴다 사라지는 말풍선 */
export class ChatBubbles {
  readonly node = el('div', 'chat-hud');
  private _bubbles = el('div', 'chat-bubbles');
  private _input = el('input', 'chat-hud-input');

  constructor(onSend: (text: string) => void) {
    this._bubbles.setAttribute('role', 'log');
    this._bubbles.setAttribute('aria-label', t('chat.label'));
    bindChatInput(this._input, onSend);
    this._input.setAttribute('aria-label', t('chat.label'));
    this.setEnabled(false);
    this.node.append(this._bubbles, this._input);
  }

  setEnabled(enabled: boolean) {
    this._input.disabled = !enabled;
    this._input.placeholder = t(enabled ? 'chat.placeholder' : 'chat.needNickname');
  }

  show(name: string, text: string) {
    const bubble = el('div', 'chat-bubble');
    bubble.append(el('span', 'chat-name', name), el('span', 'chat-text', text));
    this._bubbles.append(bubble);
    while (this._bubbles.childElementCount > MAX_BUBBLES) this._bubbles.firstElementChild?.remove();
    window.setTimeout(() => bubble.remove(), BUBBLE_MS);
  }
}
