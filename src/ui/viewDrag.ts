import { DEFAULT_VIEW_ANGLE, dragViewAngle, type ViewAngle, type ViewAngleStore } from '../viewAngle';

/**
 * 게임 화면(target) 을 끌어 카메라 각도를 바꾼다. 위아래로 끌면 기울기, 좌우로 끌면 옆으로 도는 각도다.
 * 손을 떼면 그 각도로 저장하고, 두 번 누르면 기본 각도로 돌아간다. 마우스와 터치 모두 받는다.
 */
export function attachViewDrag(target: HTMLElement, store: ViewAngleStore) {
  let drag: { id: number; x: number; y: number; start: ViewAngle } | null = null;

  target.classList.add('is-draggable');
  target.addEventListener('pointerdown', (e) => {
    if (drag || (e.pointerType === 'mouse' && e.button !== 0)) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, start: store.value };
    target.setPointerCapture(e.pointerId);
    target.classList.add('is-dragging');
  });
  target.addEventListener('pointermove', (e) => {
    if (drag?.id !== e.pointerId) return;
    store.set(dragViewAngle(drag.start, e.clientX - drag.x, e.clientY - drag.y));
  });
  const end = (e: PointerEvent) => {
    if (drag?.id !== e.pointerId) return;
    drag = null;
    target.classList.remove('is-dragging');
    store.save();
  };
  target.addEventListener('pointerup', end);
  target.addEventListener('pointercancel', end);
  target.addEventListener('dblclick', () => {
    store.set(DEFAULT_VIEW_ANGLE);
    store.save();
  });
}
