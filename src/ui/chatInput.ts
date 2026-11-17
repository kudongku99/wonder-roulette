import { CHAT_WINDOW_MS, CHATS_PER_WINDOW, MAX_CHAT_LENGTH } from '../room/protocol';

/**
 * 채팅 입력창에 엔터로 보내기를 붙인다. 한글 조합 중의 엔터는 보내지 않고,
 * 입력 중의 키가 게임의 단축키나 방향키로 흘러가지 않게 막는다.
 * 서버가 횟수를 제한하므로, 버려질 글은 지우지 않고 남겨 둔다
 */
export function bindChatInput(input: HTMLInputElement, onSend: (text: string) => void) {
  const sent: number[] = [];
  input.maxLength = MAX_CHAT_LENGTH;
  input.autocomplete = 'off';
  input.type = 'text';
  input.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key !== 'Enter' || e.isComposing || e.keyCode === 229) return;
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    const now = performance.now();
    while (sent.length && now - sent[0] >= CHAT_WINDOW_MS) sent.shift();
    if (sent.length >= CHATS_PER_WINDOW) return;
    sent.push(now);
    input.value = '';
    onSend(text);
  });
  input.addEventListener('keyup', (e) => e.stopPropagation());
}
