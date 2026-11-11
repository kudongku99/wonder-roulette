const NAMES_KEY = 'roulette3d:names';
const MAP_KEY = 'roulette3d:map';

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

/** 저장해 둔 이름 항목('이름' 또는 '이름*개수'). 없거나 읽을 수 없으면 빈 배열 */
export function loadNames(): string[] {
  try {
    const parsed: unknown = JSON.parse(read(NAMES_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

export function saveNames(entries: string[]) {
  write(NAMES_KEY, JSON.stringify(entries));
}

/** 마지막으로 고른 맵. 없거나 범위를 벗어나면 0 */
export function loadMapIndex(mapCount: number): number {
  const index = Number(read(MAP_KEY));
  return Number.isInteger(index) && index >= 0 && index < mapCount ? index : 0;
}

export function saveMapIndex(index: number) {
  write(MAP_KEY, String(index));
}
