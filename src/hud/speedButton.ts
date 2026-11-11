import { el } from '../utils/dom';

/** 누르면 빨리 감기를 켜고 끄는 버튼 */
export class SpeedButton {
  readonly node = el('button', 'hud-button speed-button');
  private _on = false;

  constructor(label: string, onToggle: (on: boolean) => void) {
    this.node.type = 'button';
    this.node.title = label;
    this.node.setAttribute('aria-label', label);
    this.node.setAttribute('aria-pressed', 'false');
    this.node.append(el('span', 'speed-icon', '▶▶'), el('span', 'speed-value', '×2'));
    this.node.addEventListener('click', () => {
      this._on = !this._on;
      this.node.classList.toggle('is-on', this._on);
      this.node.setAttribute('aria-pressed', String(this._on));
      onToggle(this._on);
    });
  }
}
