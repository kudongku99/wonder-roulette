/** 사용자가 고르는 화면 설정. 브라우저에 저장된다 */
export type Settings = {
  /** 카메라가 위에서 내려다보는 각도 (도). 음수면 아래에서 올려다본다 */
  tilt: number;
  shadows: boolean;
  bloom: boolean;
};

export const TILT_MIN = -30;
export const TILT_MAX = 30;
export const DEFAULT_SETTINGS: Settings = { tilt: 17, shadows: true, bloom: true };

const STORAGE_KEY = 'roulette3d:settings';

/** 저장된 글을 설정으로 읽는다. 없거나 잘못된 값은 기본값, 기울기는 범위 안으로 자른다 */
export function parseSettings(raw: string | null): Settings {
  let value: Partial<Record<keyof Settings, unknown>> = {};
  try {
    const parsed: unknown = JSON.parse(raw ?? '{}');
    if (parsed && typeof parsed === 'object') value = parsed;
  } catch {}
  const tilt = typeof value.tilt === 'number' && Number.isFinite(value.tilt) ? value.tilt : DEFAULT_SETTINGS.tilt;
  return {
    tilt: Math.round(Math.min(TILT_MAX, Math.max(TILT_MIN, tilt))),
    shadows: typeof value.shadows === 'boolean' ? value.shadows : DEFAULT_SETTINGS.shadows,
    bloom: typeof value.bloom === 'boolean' ? value.bloom : DEFAULT_SETTINGS.bloom,
  };
}

/** 설정을 들고 있다가 바뀌면 저장하고 듣는 쪽에 알린다 */
export class SettingsStore {
  private _value: Settings;
  private _listeners: ((settings: Settings) => void)[] = [];

  constructor() {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch {}
    this._value = parseSettings(raw);
  }

  get value(): Settings {
    return this._value;
  }

  /** 지금 값으로 한 번 부르고, 이후 바뀔 때마다 부른다 */
  subscribe(listener: (settings: Settings) => void) {
    this._listeners.push(listener);
    listener(this._value);
  }

  update(change: Partial<Settings>) {
    this._value = parseSettings(JSON.stringify({ ...this._value, ...change }));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._value));
    } catch {}
    for (const listener of this._listeners) listener(this._value);
  }
}
