import { addNames, type NameEntry, removeName, totalCount } from '../ui/nameList';
import { MAX_MARBLES } from '../utils/utils';
import type { ClientMessage } from './protocol';

export const MAX_NICKNAME_LENGTH = 12;
/** 방 하나에 들어올 수 있는 사람 수 (구슬 없이 보기만 하는 사람 포함) */
export const MAX_MEMBERS = 100;

export type RoomMember = {
  id: string;
  /** 구슬에 붙는 이름. null 이면 구슬 없이 보기만 한다 */
  nickname: string | null;
  connected: boolean;
};

/** 방 안의 모두가 똑같이 받는 상태 */
export type RoomState = {
  code: string;
  hostId: string | null;
  mapIndex: number;
  /** 들어온 순서 */
  members: RoomMember[];
  /** 방장이 직접 넣은 이름 (접속하지 않은 사람 몫) */
  extras: NameEntry[];
  /** waiting 은 대기실, playing 은 방장이 경기를 돌리고 나머지는 받아 보는 중 (카운트다운부터 결과까지) */
  phase: 'waiting' | 'playing';
  /** 몇 번째 판인지. 방장이 시작하거나 다시 할 때마다 늘어난다 */
  round: number;
  /** 이번 판의 구슬 이름. 자리가 구슬 id 다. 대기실에서는 비어 있다 */
  roster: string[];
  /** 결과가 서버에 남아 있는 가장 최근 판. 이 판의 결과 링크를 만들 수 있다. 없으면 0 */
  resultRound: number;
};

export type RoomError = 'notFound' | 'roomFull' | 'marblesFull' | 'notHost' | 'busy' | 'invalid';

export type RoomResult = { ok: true; state: RoomState; rejected?: string[] } | { ok: false; error: RoomError };

const fail = (error: RoomError): RoomResult => ({ ok: false, error });

export function createRoom(code: string): RoomState {
  return {
    code,
    hostId: null,
    mapIndex: 0,
    members: [],
    extras: [],
    phase: 'waiting',
    round: 0,
    roster: [],
    resultRound: 0,
  };
}

/** 방의 구슬 수. 닉네임을 넣은 사람마다 하나, 방장이 넣은 이름은 적힌 개수만큼 */
export function marbleCount(state: RoomState): number {
  return state.members.filter((member) => member.nickname !== null).length + totalCount(state.extras);
}

/** 게임과 구슬 박스에 넘길 이름 목록. 사람이 먼저, 방장이 넣은 이름이 뒤에 오고 같은 이름은 합친다 */
export function roomMarbles(state: RoomState): NameEntry[] {
  const list: NameEntry[] = [];
  const add = (name: string, count: number) => {
    const existing = list.find((entry) => entry.name === name);
    if (existing) existing.count += count;
    else list.push({ name, count });
  };
  for (const member of state.members) if (member.nickname !== null) add(member.nickname, 1);
  for (const extra of state.extras) add(extra.name, extra.count);
  return list;
}

/** 이름 문법에 걸리는 글자(`*`, 쉼표, 줄바꿈) 를 빼고 길이를 맞춘다. 남는 글자가 없으면 null */
export function cleanNickname(raw: string): string | null {
  const flat = raw
    .replace(/[*,\r\n\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const cut = Array.from(flat).slice(0, MAX_NICKNAME_LENGTH).join('').trim();
  return cut || null;
}

/** 이미 쓰는 이름이면 뒤에 2, 3, … 을 붙인다 */
export function uniqueNickname(name: string, taken: string[]): string {
  if (!taken.includes(name)) return name;
  let n = 2;
  while (taken.includes(`${name} ${n}`)) n++;
  return `${name} ${n}`;
}

/** 방에 들어온다. 이미 있는 사람이면 다시 연결된 것으로 본다. 방장이 없으면 방장이 된다 */
export function join(state: RoomState, memberId: string): RoomResult {
  const existing = state.members.find((member) => member.id === memberId);
  if (!existing && state.members.length >= MAX_MEMBERS) return fail('roomFull');
  const members = existing
    ? state.members.map((member) => (member.id === memberId ? { ...member, connected: true } : member))
    : [...state.members, { id: memberId, nickname: null, connected: true }];
  return { ok: true, state: { ...state, members, hostId: state.hostId ?? memberId } };
}

/** 연결이 끊겼다. 잠시 기다리는 동안 자리와 구슬은 그대로 둔다 */
export function leave(state: RoomState, memberId: string): RoomState {
  return {
    ...state,
    members: state.members.map((member) => (member.id === memberId ? { ...member, connected: false } : member)),
  };
}

/**
 * 방에서 뺀다. 방장이 빠지면 연결돼 있는 사람 중 가장 먼저 들어온 사람이 방장이 된다.
 * 경기는 방장의 화면에서 돌고 있었으므로 그 판은 없던 것으로 하고 대기실로 돌아간다
 */
export function drop(state: RoomState, memberId: string): RoomState {
  const members = state.members.filter((member) => member.id !== memberId);
  if (state.hostId !== memberId) return { ...state, members };
  const hostId = (members.find((member) => member.connected) ?? members[0])?.id ?? null;
  return { ...state, members, hostId, phase: 'waiting', roster: [] };
}

/** 구슬 목록을 이름 하나당 구슬 하나로 펼쳐 정렬한다. 방장이 보낸 이번 판 이름과 견주는 데 쓴다 */
function sortedNames(entries: NameEntry[]): string[] {
  return entries.flatMap((entry) => Array<string>(entry.count).fill(entry.name)).sort();
}

/**
 * 방장이 보낸 최종 순위(구슬 id, 1등부터) 를 이름으로 바꾼다.
 * 이번 판의 구슬이 빠짐없이 한 번씩 들어 있어야 하고, 아니면 null
 */
export function rankedNames(state: RoomState, ranks: number[]): string[] | null {
  if (state.roster.length === 0 || ranks.length !== state.roster.length) return null;
  if (new Set(ranks).size !== ranks.length) return null;
  if (ranks.some((id) => !Number.isInteger(id) || id < 0 || id >= state.roster.length)) return null;
  return ranks.map((id) => state.roster[id]);
}

function setNickname(state: RoomState, memberId: string, raw: string): RoomResult {
  const me = state.members.find((member) => member.id === memberId);
  if (!me) return fail('invalid');
  const cleaned = cleanNickname(raw);
  if (cleaned !== null && me.nickname === null && marbleCount(state) >= MAX_MARBLES) return fail('marblesFull');
  const taken = state.members.flatMap((member) => (member.id !== memberId && member.nickname ? [member.nickname] : []));
  const nickname = cleaned === null ? null : uniqueNickname(cleaned, taken);
  return {
    ok: true,
    state: {
      ...state,
      members: state.members.map((member) => (member.id === memberId ? { ...member, nickname } : member)),
    },
  };
}

/** 방 안의 한 사람이 보낸 요청을 상태에 반영한다. 방장만 할 수 있는 일은 방장인지 확인한다 */
export function applyMessage(
  state: RoomState,
  memberId: string,
  message: Exclude<ClientMessage, { type: 'hello' | 'leave' | 'cheer' }>
): RoomResult {
  if (message.type === 'nickname') {
    return state.phase === 'waiting' ? setNickname(state, memberId, message.nickname) : fail('busy');
  }
  if (state.hostId !== memberId) return fail('notHost');
  if (message.type === 'start') {
    // 방장이 섞은 순서를 그대로 쓰되, 방의 구슬 목록과 이름 구성이 같아야 한다
    const expected = sortedNames(roomMarbles(state));
    const given = [...message.names].sort();
    if (expected.length === 0 || expected.length !== given.length) return fail('invalid');
    if (expected.some((name, i) => name !== given[i])) return fail('invalid');
    return { ok: true, state: { ...state, phase: 'playing', round: state.round + 1, roster: message.names } };
  }
  if (message.type === 'end') return { ok: true, state: { ...state, phase: 'waiting', roster: [] } };
  if (message.type === 'result') {
    if (state.phase !== 'playing' || !rankedNames(state, message.ranks)) return fail('invalid');
    return { ok: true, state: { ...state, resultRound: state.round } };
  }
  if (message.type === 'kick') {
    if (message.memberId === memberId) return fail('invalid');
    if (!state.members.some((member) => member.id === message.memberId)) return fail('invalid');
    return { ok: true, state: drop(state, message.memberId) };
  }
  if (state.phase !== 'waiting') return fail('busy');
  switch (message.type) {
    case 'map':
      return { ok: true, state: { ...state, mapIndex: message.index } };
    case 'addNames': {
      const people = marbleCount(state) - totalCount(state.extras);
      const { list, rejected } = addNames(state.extras, message.text, MAX_MARBLES - people);
      return { ok: true, state: { ...state, extras: list }, rejected };
    }
    case 'removeName':
      return { ok: true, state: { ...state, extras: removeName(state.extras, message.name) } };
    case 'transfer': {
      // 경기는 방장의 화면에서 도니 대기실에서만, 지금 연결돼 있는 사람에게만 넘긴다
      const target = state.members.find((member) => member.id === message.memberId);
      if (!target?.connected) return fail('invalid');
      return { ok: true, state: { ...state, hostId: target.id } };
    }
  }
}
