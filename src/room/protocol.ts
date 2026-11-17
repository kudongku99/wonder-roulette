import type { RoomError, RoomState } from './roomState';

/** 응원으로 보낼 수 있는 이모지. 메시지에는 이 목록 안의 순번을 싣는다 */
export const CHEERS = ['👏', '🔥', '😂', '😱', '🎉', '🙏'];
/** 한 사람이 1초에 보낼 수 있는 응원 수 */
export const CHEERS_PER_SECOND = 2;

/** 채팅 한 줄의 길이 상한 (글자 수) */
export const MAX_CHAT_LENGTH = 100;
/** 한 사람이 CHAT_WINDOW_MS 안에 보낼 수 있는 채팅 수. 응원과 따로 센다 */
export const CHATS_PER_WINDOW = 4;
export const CHAT_WINDOW_MS = 5000;

/** 채팅 글을 정리한다. 줄바꿈과 겹친 공백을 한 칸으로 줄이고 앞뒤를 자르고 상한에서 끊는다. 빈 글이면 null */
export function cleanChat(raw: string): string | null {
  const flat = raw.replace(/\s+/g, ' ').trim();
  const cut = Array.from(flat).slice(0, MAX_CHAT_LENGTH).join('').trim();
  return cut || null;
}

/** 방 코드에 쓰는 글자. 헷갈리는 0·O, 1·I 는 뺐다 */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_LENGTH = 6;
const ROOM_CODE_PATTERN = new RegExp(`^[${ROOM_CODE_ALPHABET}]{${ROOM_CODE_LENGTH}}$`);

/** 맵 번호로 받아 주는 가장 큰 값. 서버는 맵 목록을 모르므로 범위만 막고, 화면이 자기 맵 수에 맞춘다 */
export const MAX_MAP_INDEX = 63;
const MAX_TEXT_LENGTH = 2000;
/** 한 판의 구슬 수 상한 (MAX_MARBLES 와 같다) */
const MAX_ROSTER = 100;

/** 웹소켓을 닫을 때 쓰는 코드 */
export const CLOSE_NOT_FOUND = 4404;
export const CLOSE_ROOM_FULL = 4403;
/** 같은 사람이 다른 연결로 다시 들어와서 옛 연결을 끊는다 */
export const CLOSE_REPLACED = 4409;
/** 방장이 내보냈다 */
export const CLOSE_KICKED = 4410;

export type ClientMessage =
  /** 연결하자마자 한 번. clientId 는 브라우저 탭이 간직하는 비밀 값이고, 같은 값이면 같은 사람으로 다시 들어온다 */
  | { type: 'hello'; clientId: string }
  /** 내 구슬 이름. 빈 글이면 구슬을 뺀다 */
  | { type: 'nickname'; nickname: string }
  | { type: 'map'; index: number }
  | { type: 'addNames'; text: string }
  | { type: 'removeName'; name: string }
  /** 방장이 이번 판을 시작한다. names 는 섞은 뒤의 구슬 이름이고 자리가 구슬 id 다. 결과 화면에서 다시 보내면 새 판이다 */
  | { type: 'start'; names: string[] }
  /** 방장이 판을 끝내고 모두 대기실로 돌아간다 */
  | { type: 'end' }
  /** 방장이 끝난 판의 최종 순위를 남긴다. ranks 는 구슬 id 이고 1등부터다. 결과 링크로 다시 볼 수 있다 */
  | { type: 'result'; ranks: number[] }
  /** 방장이 다른 사람을 내보낸다. 링크를 다시 열면 새 사람으로 들어올 수 있다 */
  | { type: 'kick'; memberId: string }
  /** 방장이 대기실에서 방장 자리를 넘긴다 */
  | { type: 'transfer'; memberId: string }
  /** 응원. emoji 는 CHEERS 안의 순번이다. 방 상태에는 남지 않는다 */
  | { type: 'cheer'; emoji: number }
  /** 채팅. 닉네임을 넣은 사람만 보낼 수 있다. 방 상태에는 남지 않는다 */
  | { type: 'chat'; text: string }
  /** 스스로 나간다. 끊긴 것과 달리 기다리지 않고 바로 자리를 비운다 */
  | { type: 'leave' };

export type ServerMessage =
  | { type: 'welcome'; memberId: string; state: RoomState }
  | { type: 'state'; state: RoomState }
  /** 방장이 넣으려던 이름 중 구슬 상한 때문에 받지 못한 항목 */
  | { type: 'rejected'; names: string[] }
  | { type: 'cheer'; memberId: string; emoji: number }
  | { type: 'chat'; memberId: string; text: string }
  | { type: 'error'; error: RoomError };

export function isRoomCode(value: string): boolean {
  return ROOM_CODE_PATTERN.test(value);
}

/** 주소의 `?room=코드` 를 읽는다. 소문자로 적어도 받는다. 없거나 모양이 틀리면 null */
export function readRoomCode(search: string): string | null {
  const code = new URLSearchParams(search).get('room')?.trim().toUpperCase() ?? '';
  return isRoomCode(code) ? code : null;
}

/** 서버에 남겨 둔 한 판의 결과. 결과 링크(`?result=코드-판`) 로 다시 본다 */
export type SharedResult = {
  code: string;
  round: number;
  /** 구슬 이름. 1등부터다 */
  names: string[];
  mapIndex: number;
  /** 끝난 시각 (ms) */
  at: number;
};

/** 결과 링크에 싣는 값. 방 코드와 판 번호다 */
export function resultId(code: string, round: number): string {
  return `${code}-${round}`;
}

/** 주소의 `?result=코드-판` 을 읽는다. 없거나 모양이 틀리면 null */
export function readResultId(search: string): { code: string; round: number } | null {
  const match = /^([A-Za-z0-9]+)-(\d{1,6})$/.exec(new URLSearchParams(search).get('result')?.trim() ?? '');
  if (!match) return null;
  const code = match[1].toUpperCase();
  const round = Number(match[2]);
  return isRoomCode(code) && round >= 1 ? { code, round } : null;
}

const isText = (value: unknown, max: number): value is string => typeof value === 'string' && value.length <= max;

/** 받은 글을 요청으로 읽는다. 모양이 틀리면 null */
export function parseClientMessage(raw: string): ClientMessage | null {
  let data: any;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== 'object' || data === null) return null;
  switch (data.type) {
    case 'hello':
      return isText(data.clientId, 64) && data.clientId.length >= 16
        ? { type: 'hello', clientId: data.clientId }
        : null;
    case 'nickname':
      return isText(data.nickname, 200) ? { type: 'nickname', nickname: data.nickname } : null;
    case 'map':
      return Number.isInteger(data.index) && data.index >= 0 && data.index <= MAX_MAP_INDEX
        ? { type: 'map', index: data.index }
        : null;
    case 'addNames':
      return isText(data.text, MAX_TEXT_LENGTH) ? { type: 'addNames', text: data.text } : null;
    case 'removeName':
      return isText(data.name, 200) ? { type: 'removeName', name: data.name } : null;
    case 'start':
      return Array.isArray(data.names) &&
        data.names.length <= MAX_ROSTER &&
        data.names.every((name: unknown) => isText(name, 200))
        ? { type: 'start', names: data.names }
        : null;
    case 'end':
      return { type: 'end' };
    case 'result':
      return Array.isArray(data.ranks) &&
        data.ranks.length <= MAX_ROSTER &&
        data.ranks.every((id: unknown) => Number.isInteger(id))
        ? { type: 'result', ranks: data.ranks }
        : null;
    case 'kick':
    case 'transfer':
      return isText(data.memberId, 16) ? { type: data.type, memberId: data.memberId } : null;
    case 'cheer':
      return Number.isInteger(data.emoji) && data.emoji >= 0 && data.emoji < CHEERS.length
        ? { type: 'cheer', emoji: data.emoji }
        : null;
    case 'chat': {
      if (!isText(data.text, MAX_CHAT_LENGTH * 4)) return null;
      const text = cleanChat(data.text);
      return text === null ? null : { type: 'chat', text };
    }
    case 'leave':
      return { type: 'leave' };
    default:
      return null;
  }
}
