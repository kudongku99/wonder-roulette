/** 카메라가 맵을 보는 각도 (도). 게임 화면을 끌어서 바꾸고 브라우저에 저장된다 */
export type ViewAngle = {
  /** 위에서 내려다보는 각도. 음수면 아래에서 올려다본다 */
  tilt: number;
  /** 옆으로 돌아가 보는 각도. 양수면 오른쪽에서 본다 */
  yaw: number;
};

export const TILT_LIMIT = 30;
export const YAW_LIMIT = 30;
export const DEFAULT_VIEW_ANGLE: ViewAngle = { tilt: 17, yaw: 0 };
/** 끌어서 움직인 한 픽셀이 바꾸는 각도 (도) */
export const DEGREES_PER_PIXEL = 0.2;

const STORAGE_KEY = 'roulette3d:viewAngle';

function clamp(value: number, limit: number) {
  return Math.min(limit, Math.max(-limit, value));
}

/** 저장된 글을 각도로 읽는다. 없거나 잘못된 값은 기본값이고, 범위를 넘으면 자른다 */
export function parseViewAngle(raw: string | null): ViewAngle {
  let value: Partial<Record<keyof ViewAngle, unknown>> = {};
  try {
    const parsed: unknown = JSON.parse(raw ?? '{}');
    if (parsed && typeof parsed === 'object') value = parsed;
  } catch {}
  const read = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
  return {
    tilt: clamp(read(value.tilt, DEFAULT_VIEW_ANGLE.tilt), TILT_LIMIT),
    yaw: clamp(read(value.yaw, DEFAULT_VIEW_ANGLE.yaw), YAW_LIMIT),
  };
}

/**
 * 끌기 시작했을 때의 각도에서 (dx, dy) 픽셀만큼 끈 뒤의 각도.
 * 맵을 손으로 잡고 돌리듯 움직인다: 아래로 끌면 맵 위쪽이 다가와 더 내려다보고, 오른쪽으로 끌면 맵이 오른쪽으로 돈다
 */
export function dragViewAngle(start: ViewAngle, dx: number, dy: number): ViewAngle {
  return {
    tilt: clamp(start.tilt + dy * DEGREES_PER_PIXEL, TILT_LIMIT),
    yaw: clamp(start.yaw - dx * DEGREES_PER_PIXEL, YAW_LIMIT),
  };
}

/** 각도를 들고 있다가 바뀌면 듣는 쪽에 알린다. 저장은 save 를 부를 때만 한다 (끄는 동안 매번 쓰지 않게) */
export class ViewAngleStore {
  private _value: ViewAngle;
  private _listeners: ((angle: ViewAngle) => void)[] = [];

  constructor() {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch {}
    this._value = parseViewAngle(raw);
  }

  get value(): ViewAngle {
    return this._value;
  }

  /** 지금 값으로 한 번 부르고, 이후 바뀔 때마다 부른다 */
  subscribe(listener: (angle: ViewAngle) => void) {
    this._listeners.push(listener);
    listener(this._value);
  }

  set(angle: ViewAngle) {
    this._value = parseViewAngle(JSON.stringify(angle));
    for (const listener of this._listeners) listener(this._value);
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._value));
    } catch {}
  }
}
