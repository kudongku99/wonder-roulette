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

const NICKNAME_KEY = 'roulette3d:nickname';
const CLIENT_ID_KEY = 'roulette3d:clientId';

/** 초대방에서 마지막으로 쓴 닉네임. 없으면 빈 글 */
export function loadNickname(): string {
  return read(NICKNAME_KEY) ?? '';
}

export function saveNickname(nickname: string) {
  write(NICKNAME_KEY, nickname);
}

/**
 * 초대방 서버가 같은 사람인지 알아보는 비밀 값. 탭마다 따로 두어(sessionStorage) 새로고침하면 같은 사람으로 돌아오고,
 * 같은 브라우저의 다른 탭은 다른 사람으로 들어간다
 */
export function roomClientId(): string {
  try {
    const saved = sessionStorage.getItem(CLIENT_ID_KEY);
    if (saved) return saved;
    const created = crypto.randomUUID();
    sessionStorage.setItem(CLIENT_ID_KEY, created);
    return created;
  } catch {
    return crypto.randomUUID();
  }
}
