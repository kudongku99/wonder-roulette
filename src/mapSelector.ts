// 설정창의 맵 선택. 선택한 기본 맵은 localStorage 에 기억해서 다음 방문에도 유지한다.
// 파일에서 불러온 맵은 이번 방문 동안만 목록에 남는다.

import { type StageDef, stages } from './data/maps';
import { translate } from './localization';
import type { Roulette } from './roulette';
import { parseStageFile } from './stageFile';

export interface MapSelectorOptions {
  roulette: Roulette;
  /** 맵을 바꾼 뒤 이름 입력창에서 구슬을 다시 채운다 */
  onMapChange: () => void;
  /** 번역 키를 받아 토스트로 띄운다 */
  toast: (key: string) => void;
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

export function initMapSelector({ roulette, onMapChange, toast }: MapSelectorOptions) {
  const select = document.querySelector<HTMLSelectElement>('#sltMap');
  if (!select) return;
  const loadButton = document.querySelector<HTMLButtonElement>('#btnLoadMap');
  const fileInput = document.querySelector<HTMLInputElement>('#inMapFile');

  const loaded = new Map<string, StageDef>();

  // 맵 제목은 사용자가 준 문자열일 수 있어 innerHTML 에 넣지 않는다
  function option(value: string, text: string) {
    const el = document.createElement('option');
    el.value = value;
    el.textContent = text;
    return el;
  }

  select.replaceChildren(...stages.map((stage, index) => option(`builtin:${index}`, translate(stage.title))));

  /** 맵을 바꾼다. 없는 맵이면 false */
  function apply(id: string): boolean {
    const index = builtinIndex(id);
    const stage = loaded.get(id);
    if (index !== null) {
      roulette.setMap(index);
      setSelectedMapId(id);
    } else if (stage) {
      roulette.setStage(stage, id);
    } else {
      return false;
    }
    select!.value = id;
    onMapChange();
    return true;
  }

  select.addEventListener('change', () => {
    if (!apply(select.value)) apply(DEFAULT_MAP_ID);
  });

  loadButton?.addEventListener('click', () => fileInput?.click());
  fileInput?.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) return;
    const stage = parseStageFile(await file.text());
    if (!stage) {
      toast('Failed to install the map');
      return;
    }
    const id = `file:${loaded.size}`;
    loaded.set(id, stage);
    select.append(option(id, stage.title));
    apply(id);
    toast('Map installed');
  });

  const saved = getSelectedMapId();
  if (!(saved && saved !== DEFAULT_MAP_ID && apply(saved))) {
    select.value = roulette.getCurrentMap()?.id ?? DEFAULT_MAP_ID;
  }
}
