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
const DEFAULT_MAP_ID = 'builtin:0';

function getSelectedMapId(): string | null {
  try {
    return localStorage.getItem(SELECTED_MAP_STORAGE_KEY);
  } catch {
    return null;
  }
}

function setSelectedMapId(id: string) {
  try {
    localStorage.setItem(SELECTED_MAP_STORAGE_KEY, id);
  } catch {}
}

function builtinIndex(id: string): number | null {
  if (!id.startsWith('builtin:')) return null;
  const index = Number(id.slice('builtin:'.length));
  return Number.isInteger(index) && index >= 0 && index < stages.length ? index : null;
}

export function initMapSelector({ roulette, onMapChange }: MapSelectorOptions) {
  const select = document.querySelector<HTMLSelectElement>('#sltMap');
  if (!select) return;

  select.replaceChildren(
    ...stages.map((stage, index) => {
      const el = document.createElement('option');
      el.value = `builtin:${index}`;
      el.textContent = translate(stage.title);
      return el;
    })
  );

  /** 맵을 바꾼다. 없는 맵이면 false */
  function apply(id: string): boolean {
    const index = builtinIndex(id);
    if (index === null) return false;
    roulette.setMap(index);
    setSelectedMapId(id);
    select!.value = id;
    onMapChange();
    return true;
  }

  select.addEventListener('change', () => {
    if (!apply(select.value)) apply(DEFAULT_MAP_ID);
  });

  const saved = getSelectedMapId();
  if (!(saved && saved !== DEFAULT_MAP_ID && apply(saved))) {
    select.value = roulette.getCurrentMap()?.id ?? DEFAULT_MAP_ID;
  }
}
