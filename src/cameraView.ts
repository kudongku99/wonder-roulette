/** 사용자가 고른 카메라 시점. 게임 화면을 끌고 굴려서 바꾸고 브라우저에 저장된다 */
export type CameraView = {
  /** 위에서 내려다보는 각도 (도). 음수면 아래에서 올려다본다 */
  tilt: number;
  /** 옆으로 돌아가 보는 각도 (도). 양수면 오른쪽에서 본다 */
  yaw: number;
  /** 카메라가 자동으로 정한 줌에 곱하는 배율. 1 보다 크면 가까이 본다 */
  zoom: number;
};

export const TILT_LIMIT = 30;
export const YAW_LIMIT = 30;
export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 2.5;
export const DEFAULT_CAMERA_VIEW: CameraView = { tilt: 17, yaw: 0, zoom: 1 };
/** 끌어서 움직인 한 픽셀이 바꾸는 각도 (도) */
export const DEGREES_PER_PIXEL = 0.2;

const STORAGE_KEY = 'roulette3d:cameraView';

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** 저장된 글을 시점으로 읽는다. 없거나 잘못된 값은 기본값이고, 범위를 넘으면 자른다 */
export function parseCameraView(raw: string | null): CameraView {
  let value: Partial<Record<keyof CameraView, unknown>> = {};
  try {
    const parsed: unknown = JSON.parse(raw ?? '{}');
    if (parsed && typeof parsed === 'object') value = parsed;
  } catch {}
  const read = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
  return {
    tilt: clamp(read(value.tilt, DEFAULT_CAMERA_VIEW.tilt), -TILT_LIMIT, TILT_LIMIT),
    yaw: clamp(read(value.yaw, DEFAULT_CAMERA_VIEW.yaw), -YAW_LIMIT, YAW_LIMIT),
    zoom: clamp(read(value.zoom, DEFAULT_CAMERA_VIEW.zoom), ZOOM_MIN, ZOOM_MAX),
  };
}

/**
 * 끌기 시작했을 때의 시점에서 (dx, dy) 픽셀만큼 끈 뒤의 시점. 배율은 그대로다.
 * 맵을 손으로 잡고 돌리듯 움직인다: 아래로 끌면 맵 위쪽이 다가와 더 내려다보고, 오른쪽으로 끌면 맵이 오른쪽으로 돈다
 */
export function dragCameraView(start: CameraView, dx: number, dy: number): CameraView {
  return {
    tilt: clamp(start.tilt + dy * DEGREES_PER_PIXEL, -TILT_LIMIT, TILT_LIMIT),
    yaw: clamp(start.yaw - dx * DEGREES_PER_PIXEL, -YAW_LIMIT, YAW_LIMIT),
    zoom: start.zoom,
  };
}

/** 배율에 factor 를 곱한 시점. 1 보다 크면 다가간다 */
export function zoomCameraView(start: CameraView, factor: number): CameraView {
  return { ...start, zoom: clamp(start.zoom * factor, ZOOM_MIN, ZOOM_MAX) };
}

/** 시점을 들고 있다가 바뀌면 듣는 쪽에 알린다. 저장은 save 를 부를 때만 한다 (끄는 동안 매번 쓰지 않게) */
export class CameraViewStore {
  private _value: CameraView;
  private _listeners: ((view: CameraView) => void)[] = [];

  constructor() {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch {}
    this._value = parseCameraView(raw);
  }

  get value(): CameraView {
    return this._value;
  }

  /** 지금 값으로 한 번 부르고, 이후 바뀔 때마다 부른다 */
  subscribe(listener: (view: CameraView) => void) {
    this._listeners.push(listener);
    listener(this._value);
  }

  set(view: CameraView) {
    this._value = parseCameraView(JSON.stringify(view));
    for (const listener of this._listeners) listener(this._value);
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._value));
    } catch {}
  }
}
