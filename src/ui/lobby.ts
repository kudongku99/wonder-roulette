import { t } from '../i18n';
import { el, marbleColor } from '../utils/dom';
import { MAX_MARBLES } from '../utils/utils';
import { addNames, type NameEntry, removeName, totalCount } from './nameList';

/** 칩이 사라지는 애니메이션 길이 (ms). 스타일의 chip-out 과 맞춘다 */
const CHIP_OUT_MS = 180;

/**
 * 로비. 이름을 입력해 목록을 만든다. 엔터 한 번에 입력창의 내용을 더하고,
 * 쉼표나 줄바꿈으로 나뉜 여러 이름(붙여넣기) 도 한 번에 받는다. 칩을 누르면 그 이름을 지운다.
 */
export class Lobby {
  readonly node = el('section', 'screen lobby');
  private _input = el('input', 'lobby-input');
  private _chips = el('ul', 'lobby-chips');
  private _notice = el('p', 'lobby-notice');
  private _count = el('span', 'lobby-count');
  private _next = el('button', 'ui-button is-primary', t('lobby.next'));
  private _clear = el('button', 'ui-button is-quiet', t('lobby.clear'));
  private _list: NameEntry[] = [];

  /**
   * @param onChange 목록이 바뀔 때마다 부른다
   * @param onNext 다음 버튼을 눌렀을 때
   */
  constructor(
    initial: string[],
    private onChange: (list: NameEntry[]) => void,
    onNext: () => void
  ) {
    const card = el('div', 'ui-panel lobby-card');
    const logo = el('h1', 'logo');
    logo.append(el('span', 'logo-accent', 'WONDER'), el('span', 'logo-main', 'ROULETTE'));

    const label = el('label', 'lobby-label', t('lobby.heading'));
    label.htmlFor = 'lobbyInput';
    this._input.id = 'lobbyInput';
    this._input.type = 'text';
    this._input.autocomplete = 'off';
    this._input.placeholder = t('lobby.placeholder');
    this._input.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || e.isComposing) return;
      e.preventDefault();
      this.add(this._input.value);
      this._input.value = '';
    });
    // 여러 줄을 붙여넣으면 input 이 줄바꿈을 지워 이름이 붙어 버리므로 직접 받는다
    this._input.addEventListener('paste', (e) => {
      const text = e.clipboardData?.getData('text') ?? '';
      if (!/[\r\n]/.test(text)) return;
      e.preventDefault();
      this.add(text);
    });

    this._notice.hidden = true;
    this._notice.setAttribute('role', 'status');
    this._chips.setAttribute('aria-live', 'polite');

    const footer = el('div', 'lobby-footer');
    this._next.type = 'button';
    this._clear.type = 'button';
    this._next.addEventListener('click', onNext);
    this._clear.addEventListener('click', () => this.setList([]));
    footer.append(this._count, this._clear, this._next);

    card.append(logo, label, this._input, el('p', 'lobby-hint', t('lobby.hint')), this._chips, this._notice, footer);
    this.node.append(card);

    this._list = addNames([], initial.join(',')).list;
    this.render();
  }

  get list(): NameEntry[] {
    return this._list;
  }

  focus() {
    this._input.focus();
  }

  private add(text: string) {
    const { list, rejected } = addNames(this._list, text);
    this._notice.hidden = rejected.length === 0;
    this._notice.textContent = rejected.length
      ? t('lobby.limit', { max: MAX_MARBLES, names: rejected.join(', ') })
      : '';
    this.setList(list);
  }

  private setList(list: NameEntry[]) {
    this._list = list;
    this.render();
    this.onChange(list);
  }

  private remove(entry: NameEntry, chip: HTMLElement) {
    this._notice.hidden = true;
    chip.classList.add('is-leaving');
    this._list = removeName(this._list, entry.name);
    this.renderSummary();
    this.onChange(this._list);
    window.setTimeout(() => chip.remove(), CHIP_OUT_MS);
  }

  private render() {
    const total = totalCount(this._list);
    let seen = 0;
    this._chips.replaceChildren(
      ...this._list.map((entry) => {
        const chip = el('li', 'lobby-chip');
        const button = el('button', 'chip-button');
        button.type = 'button';
        button.title = t('lobby.remove', { name: entry.name });
        // 구슬 색은 게임에서 순서대로 색상환을 돌므로, 칩도 목록 안의 위치로 색을 정한다
        button.style.setProperty('--chip-color', marbleColor(total ? (360 / total) * seen : 0));
        seen += entry.count;
        button.append(el('span', 'chip-name', entry.name));
        if (entry.count > 1) button.append(el('span', 'chip-count', `×${entry.count}`));
        button.append(el('span', 'chip-remove', '✕'));
        button.addEventListener('click', () => this.remove(entry, chip));
        chip.append(button);
        return chip;
      })
    );
    this.renderSummary();
  }

  private renderSummary() {
    const total = totalCount(this._list);
    this._count.textContent = t('lobby.count', { n: total, max: MAX_MARBLES });
    this._next.disabled = total === 0;
    this._clear.hidden = total === 0;
    this._chips.dataset.empty = total === 0 ? t('lobby.empty') : '';
  }
}
