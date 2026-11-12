import {
  type CameraView,
  type CameraViewStore,
  DEFAULT_CAMERA_VIEW,
  dragCameraView,
  zoomCameraView,
} from '../cameraView';

/** 휠 한 칸(픽셀 단위 deltaY 100) 에 바뀌는 배율의 지수. exp(-100 × 이 값) ≈ 0.86 */
const WHEEL_ZOOM_RATE = 0.0015;
/** 트랙패드 핀치(ctrlKey 가 붙은 휠) 는 deltaY 가 작게 들어오므로 더 민감하게 받는다 */
const PINCH_ZOOM_RATE = 0.01;
/** 휠을 멈추고 이 시간(ms) 이 지나면 저장한다 */
const SAVE_DELAY = 300;

/** 휠 deltaMode 가 줄·쪽 단위일 때 픽셀로 바꾸는 값 */
function wheelPixels(e: WheelEvent) {
  if (e.deltaMode === WheelEvent.DOM_DELTA_LINE) return e.deltaY * 16;
  if (e.deltaMode === WheelEvent.DOM_DELTA_PAGE) return e.deltaY * 400;
  return e.deltaY;
}

/**
 * 게임 화면(target) 으로 카메라 시점을 바꾼다.
 * - 끌기: 위아래로 기울기, 좌우로 옆으로 도는 각도
 * - 휠·트랙패드 핀치·두 손가락 핀치: 배율
 * - 두 번 누르기: 기본 시점
 * 끌기와 핀치는 손을 뗄 때, 휠은 멈춘 뒤 잠시 지나 저장한다.
 */
export function attachViewControls(target: HTMLElement, store: CameraViewStore) {
  const pointers = new Map<number, { x: number; y: number }>();
  let drag: { x: number; y: number; start: CameraView } | null = null;
  let pinch: { distance: number; start: CameraView } | null = null;
  let saveTimer = 0;

  const saveLater = () => {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => store.save(), SAVE_DELAY);
  };
  const pinchDistance = () => {
    const [a, b] = [...pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  target.classList.add('is-draggable');
  target.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    target.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      drag = { x: e.clientX, y: e.clientY, start: store.value };
      target.classList.add('is-dragging');
    } else if (pointers.size === 2) {
      // 두 손가락이 닿으면 끌기를 멈추고 핀치로 바꾼다
      drag = null;
      pinch = { distance: pinchDistance(), start: store.value };
    }
  });
  target.addEventListener('pointermove', (e) => {
    const point = pointers.get(e.pointerId);
    if (!point) return;
    point.x = e.clientX;
    point.y = e.clientY;
    if (pinch && pointers.size === 2) {
      const distance = pinchDistance();
      if (pinch.distance > 0) store.set(zoomCameraView(pinch.start, distance / pinch.distance));
    } else if (drag) {
      store.set(dragCameraView(drag.start, e.clientX - drag.x, e.clientY - drag.y));
    }
  });
  const end = (e: PointerEvent) => {
    if (!pointers.delete(e.pointerId)) return;
    if (pointers.size < 2) pinch = null;
    if (pointers.size === 0) {
      drag = null;
      target.classList.remove('is-dragging');
      store.save();
    }
  };
  target.addEventListener('pointerup', end);
  target.addEventListener('pointercancel', end);

  // 페이지 확대(트랙패드 핀치, Ctrl+휠) 대신 게임 화면을 확대하도록 기본 동작을 막는다
  target.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const rate = e.ctrlKey ? PINCH_ZOOM_RATE : WHEEL_ZOOM_RATE;
      store.set(zoomCameraView(store.value, Math.exp(-wheelPixels(e) * rate)));
      saveLater();
    },
    { passive: false }
  );
  // 사파리는 트랙패드 핀치를 휠이 아니라 gesture 이벤트로 보낸다
  let gestureStart: CameraView | null = null;
  target.addEventListener('gesturestart', (e) => {
    e.preventDefault();
    gestureStart = store.value;
  });
  target.addEventListener('gesturechange', (e) => {
    e.preventDefault();
    const scale = (e as Event & { scale?: number }).scale;
    if (gestureStart && scale) store.set(zoomCameraView(gestureStart, scale));
  });
  target.addEventListener('gestureend', (e) => {
    e.preventDefault();
    gestureStart = null;
    store.save();
  });

  target.addEventListener('dblclick', () => {
    store.set(DEFAULT_CAMERA_VIEW);
    store.save();
  });
}
