import { t } from '../i18n';
import { DEFAULT_SETTINGS, type Settings, type SettingsStore, TILT_MAX, TILT_MIN } from '../settings';
import { el } from '../utils/dom';

/** 화면 오른쪽 아래의 환경설정 버튼과, 누르면 그 위에 열리는 패널. 바꾼 값은 바로 저장되고 반영된다 */
export class SettingsPanel {
  readonly node = el('div', 'settings');
  private _toggle = el('button', 'ui-button settings-toggle', '⚙');
  private _panel = el('section', 'ui-panel settings-panel');
  private _tilt = el('input', 'settings-range');
  private _tiltValue = el('output', 'settings-value');
  private _shadows = el('input', 'settings-check');
  private _bloom = el('input', 'settings-check');
  private _open = false;

  constructor(store: SettingsStore) {
    this._toggle.type = 'button';
    this._toggle.title = t('settings.open');
    this._toggle.setAttribute('aria-label', t('settings.open'));
    this._toggle.setAttribute('aria-expanded', 'false');
    this._toggle.addEventListener('click', () => this.setOpen(!this._open));

    this._tilt.type = 'range';
    this._tilt.id = 'settingsTilt';
    this._tilt.min = String(TILT_MIN);
    this._tilt.max = String(TILT_MAX);
    this._tilt.step = '1';
    this._tilt.addEventListener('input', () => store.update({ tilt: Number(this._tilt.value) }));
    const reset = el('button', 'ui-button is-quiet settings-reset', t('settings.tiltReset'));
    reset.type = 'button';
    reset.addEventListener('click', () => store.update({ tilt: DEFAULT_SETTINGS.tilt }));
    const tiltLabel = el('label', 'settings-label', t('settings.tilt'));
    tiltLabel.htmlFor = this._tilt.id;
    const tiltHead = el('div', 'settings-row');
    tiltHead.append(tiltLabel, this._tiltValue, reset);

    this._panel.hidden = true;
    this._panel.append(
      el('h2', 'settings-title', t('settings.title')),
      tiltHead,
      this._tilt,
      this.checkRow(this._shadows, 'settingsShadows', t('settings.shadows'), (on) => store.update({ shadows: on })),
      this.checkRow(this._bloom, 'settingsBloom', t('settings.bloom'), (on) => store.update({ bloom: on }))
    );
    this.node.append(this._panel, this._toggle);

    document.addEventListener('pointerdown', (e) => {
      if (this._open && !this.node.contains(e.target as Node)) this.setOpen(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this._open) {
        this.setOpen(false);
        this._toggle.focus();
      }
    });
    store.subscribe((settings) => this.show(settings));
  }

  private checkRow(input: HTMLInputElement, id: string, label: string, onChange: (on: boolean) => void) {
    input.type = 'checkbox';
    input.id = id;
    input.addEventListener('change', () => onChange(input.checked));
    const row = el('label', 'settings-row settings-check-row');
    row.htmlFor = id;
    row.append(el('span', 'settings-label', label), input);
    return row;
  }

  private setOpen(open: boolean) {
    this._open = open;
    this._panel.hidden = !open;
    this._toggle.setAttribute('aria-expanded', String(open));
    this._toggle.classList.toggle('is-on', open);
  }

  private show(settings: Settings) {
    this._tilt.value = String(settings.tilt);
    this._tiltValue.textContent = `${settings.tilt}°`;
    this._shadows.checked = settings.shadows;
    this._bloom.checked = settings.bloom;
  }
}
