// 설정창의 맵 선택. 선택한 맵은 localStorage 에 기억해서 다음 방문에도 유지한다.

import { stages } from './data/maps';
import { translate } from './localization';
import type { Roulette } from './roulette';

export interface MapSelectorOptions {
  roulette: Roulette;
  /** 맵을 바꾼 뒤 이름 입력창에서 구슬을 다시 채운다 */
  onMapChange: () => void;
}

const SELECTED_MAP_STORAGE_KEY = 'r3d_selected_map';

function getSelectedMapIndex(): number | null {
  try {
    // 예전 버전은 'builtin:{index}' 로 저장했다
    const saved = localStorage.getItem(SELECTED_MAP_STORAGE_KEY)?.replace(/^builtin:/, '');
    const index = saved ? Number(saved) : Number.NaN;
    return Number.isInteger(index) && index >= 0 && index < stages.length ? index : null;
  } catch {
    return null;
  }
}

function setSelectedMapIndex(index: number) {
  try {
    localStorage.setItem(SELECTED_MAP_STORAGE_KEY, String(index));
  } catch {}
}

export function initMapSelector({ roulette, onMapChange }: MapSelectorOptions) {
  const select = document.querySelector<HTMLSelectElement>('#sltMap');
  if (!select) return;

  select.replaceChildren(
    ...stages.map((stage, index) => {
      const el = document.createElement('option');
      el.value = String(index);
      el.textContent = translate(stage.title);
      return el;
    })
  );

  function apply(index: number) {
    roulette.setMap(index);
    setSelectedMapIndex(index);
    select!.value = String(index);
    onMapChange();
  }

  select.addEventListener('change', () => apply(Number(select.value)));

  const saved = getSelectedMapIndex();
  if (saved) {
    apply(saved);
  } else {
    select.value = String(roulette.getCurrentMap()?.index ?? 0);
  }
}
