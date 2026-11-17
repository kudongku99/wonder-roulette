import { expect, test } from 'vitest';
import { CHEERS, parseClientMessage, readResultId, readRoomCode, resultId } from '../src/room/protocol';
import {
  applyMessage,
  cleanNickname,
  createRoom,
  drop,
  join,
  leave,
  MAX_MEMBERS,
  marbleCount,
  type RoomResult,
  type RoomState,
  rankedNames,
  roomMarbles,
} from '../src/room/roomState';
import { MAX_MARBLES } from '../src/utils/utils';

function ok(result: RoomResult): RoomState {
  if (!result.ok) throw new Error(result.error);
  return result.state;
}

/** 방장 a 와 참가자 b 가 들어와 있는 방 */
function roomOfTwo(): RoomState {
  return ok(join(ok(join(createRoom('ABCDEF'), 'a')), 'b'));
}

test('처음 들어온 사람이 방장이 되고 들어온 순서대로 쌓인다', () => {
  const state = roomOfTwo();

  expect(state.hostId).toBe('a');
  expect(state.members.map((member) => member.id)).toEqual(['a', 'b']);
  expect(marbleCount(state)).toBe(0);
});

test('끊겼다가 다시 들어오면 같은 자리와 닉네임을 그대로 쓴다', () => {
  const named = ok(applyMessage(roomOfTwo(), 'b', { type: 'nickname', nickname: '영희' }));
  const left = leave(named, 'b');
  expect(left.members[1]).toEqual({ id: 'b', nickname: '영희', connected: false });
  expect(roomMarbles(left)).toEqual([{ name: '영희', count: 1 }]);

  const back = ok(join(left, 'b'));
  expect(back.members).toHaveLength(2);
  expect(back.members[1]).toEqual({ id: 'b', nickname: '영희', connected: true });
});

test('방장이 빠지면 연결된 사람 중 가장 먼저 들어온 사람이 방장이 된다', () => {
  const three = leave(ok(join(roomOfTwo(), 'c')), 'b');

  expect(drop(three, 'a').hostId).toBe('c');
  expect(drop(three, 'c').hostId).toBe('a');
  expect(drop(drop(drop(three, 'a'), 'b'), 'c').hostId).toBeNull();
});

test('방이 비었다가 다시 누가 들어오면 그 사람이 방장이다', () => {
  const empty = drop(drop(roomOfTwo(), 'a'), 'b');

  expect(ok(join(empty, 'z')).hostId).toBe('z');
});

test('정원이 차면 새 사람은 못 들어오고 있던 사람은 다시 들어온다', () => {
  let state = createRoom('ABCDEF');
  for (let i = 0; i < MAX_MEMBERS; i++) state = ok(join(state, `m${i}`));

  expect(join(state, 'late')).toEqual({ ok: false, error: 'roomFull' });
  expect(join(leave(state, 'm3'), 'm3').ok).toBe(true);
});

test('닉네임은 이름 문법에 걸리는 글자를 빼고 길이를 맞춘다', () => {
  expect(cleanNickname('  철수*3,\n영희  ')).toBe('철수 3 영희');
  expect(cleanNickname('가나다라마바사아자차카타파하')).toBe('가나다라마바사아자차카타');
  expect(cleanNickname(' * , ')).toBeNull();
});

test('같은 닉네임이 있으면 번호를 붙이고, 자기 이름으로 다시 정하면 그대로다', () => {
  let state = ok(applyMessage(roomOfTwo(), 'a', { type: 'nickname', nickname: '철수' }));
  state = ok(applyMessage(state, 'b', { type: 'nickname', nickname: '철수' }));
  expect(state.members.map((member) => member.nickname)).toEqual(['철수', '철수 2']);

  state = ok(applyMessage(state, 'a', { type: 'nickname', nickname: '철수' }));
  expect(state.members[0].nickname).toBe('철수');
});

test('빈 닉네임을 보내면 구슬을 빼고 보기만 한다', () => {
  const named = ok(applyMessage(roomOfTwo(), 'b', { type: 'nickname', nickname: '영희' }));
  const cleared = ok(applyMessage(named, 'b', { type: 'nickname', nickname: '  ' }));

  expect(cleared.members[1].nickname).toBeNull();
  expect(roomMarbles(cleared)).toEqual([]);
});

test('맵과 직접 넣는 이름은 방장만 바꾼다', () => {
  const state = roomOfTwo();

  expect(applyMessage(state, 'b', { type: 'map', index: 2 })).toEqual({ ok: false, error: 'notHost' });
  expect(applyMessage(state, 'b', { type: 'addNames', text: '민수' })).toEqual({ ok: false, error: 'notHost' });
  expect(applyMessage(state, 'b', { type: 'removeName', name: '민수' })).toEqual({ ok: false, error: 'notHost' });
  expect(ok(applyMessage(state, 'a', { type: 'map', index: 2 })).mapIndex).toBe(2);
});

test('구슬 목록은 사람이 먼저 오고 방장이 넣은 같은 이름은 합친다', () => {
  let state = ok(applyMessage(roomOfTwo(), 'b', { type: 'nickname', nickname: '영희' }));
  state = ok(applyMessage(state, 'a', { type: 'addNames', text: '민수*2, 영희' }));

  expect(roomMarbles(state)).toEqual([
    { name: '영희', count: 2 },
    { name: '민수', count: 2 },
  ]);
  expect(marbleCount(state)).toBe(4);

  state = ok(applyMessage(state, 'a', { type: 'removeName', name: '영희' }));
  expect(roomMarbles(state)).toEqual([
    { name: '영희', count: 1 },
    { name: '민수', count: 2 },
  ]);
});

test('구슬 상한은 사람과 방장이 넣은 이름을 합쳐서 센다', () => {
  const named = ok(applyMessage(roomOfTwo(), 'b', { type: 'nickname', nickname: '영희' }));
  const result = applyMessage(named, 'a', { type: 'addNames', text: `가*${MAX_MARBLES - 1}, 나` });
  if (!result.ok) throw new Error(result.error);

  expect(marbleCount(result.state)).toBe(MAX_MARBLES);
  expect(result.rejected).toEqual(['나']);
  expect(applyMessage(result.state, 'a', { type: 'nickname', nickname: '방장' })).toEqual({
    ok: false,
    error: 'marblesFull',
  });
  expect(applyMessage(result.state, 'b', { type: 'nickname', nickname: '영희2' }).ok).toBe(true);
});

test('주소에서 방 코드를 읽는다', () => {
  expect(readRoomCode('?room=abcd23')).toBe('ABCD23');
  expect(readRoomCode('?x=1&room=QWERTY')).toBe('QWERTY');
  expect(readRoomCode('?room=ABC')).toBeNull();
  expect(readRoomCode('?room=ABCD01')).toBeNull();
  expect(readRoomCode('')).toBeNull();
});

test('모양이 틀린 요청은 읽지 않는다', () => {
  expect(parseClientMessage('{"type":"map","index":1}')).toEqual({ type: 'map', index: 1 });
  expect(parseClientMessage('{"type":"map","index":1.5}')).toBeNull();
  expect(parseClientMessage('{"type":"map","index":-1}')).toBeNull();
  expect(parseClientMessage('{"type":"hello","clientId":"short"}')).toBeNull();
  expect(parseClientMessage('{"type":"nickname"}')).toBeNull();
  expect(parseClientMessage('{"type":"leave"}')).toEqual({ type: 'leave' });
  expect(parseClientMessage('{"type":"kick"}')).toBeNull();
  expect(parseClientMessage('{"type":"ban"}')).toBeNull();
  expect(parseClientMessage('not json')).toBeNull();
  expect(parseClientMessage('null')).toBeNull();
});

/** 방장 a(철수), 참가자 b(영희) 가 구슬을 올리고 방장이 민수를 직접 넣은 방 */
function roomReadyToStart(): RoomState {
  let state = ok(applyMessage(roomOfTwo(), 'a', { type: 'nickname', nickname: '철수' }));
  state = ok(applyMessage(state, 'b', { type: 'nickname', nickname: '영희' }));
  return ok(applyMessage(state, 'a', { type: 'addNames', text: '민수*2' }));
}

test('방장이 섞은 순서로 판을 시작하고, 다시 시작하면 판 번호가 오른다', () => {
  const started = ok(applyMessage(roomReadyToStart(), 'a', { type: 'start', names: ['민수', '영희', '철수', '민수'] }));
  expect(started.phase).toBe('playing');
  expect(started.round).toBe(1);
  expect(started.roster).toEqual(['민수', '영희', '철수', '민수']);

  const again = ok(applyMessage(started, 'a', { type: 'start', names: ['철수', '민수', '민수', '영희'] }));
  expect(again.round).toBe(2);
  expect(again.roster[0]).toBe('철수');
});

test('방의 구슬 목록과 이름 구성이 다르면 시작하지 못한다', () => {
  const state = roomReadyToStart();

  expect(applyMessage(state, 'a', { type: 'start', names: ['철수', '영희', '민수'] }).ok).toBe(false);
  expect(applyMessage(state, 'a', { type: 'start', names: ['철수', '영희', '민수', '훈이'] }).ok).toBe(false);
  expect(applyMessage(state, 'b', { type: 'start', names: ['철수', '영희', '민수', '민수'] })).toEqual({
    ok: false,
    error: 'notHost',
  });
  expect(applyMessage(roomOfTwo(), 'a', { type: 'start', names: [] }).ok).toBe(false);
});

test('경기 중에는 이름과 맵을 바꾸지 못하고, 방장이 끝내면 대기실로 돌아간다', () => {
  const playing = ok(applyMessage(roomReadyToStart(), 'a', { type: 'start', names: ['민수', '영희', '철수', '민수'] }));

  expect(applyMessage(playing, 'b', { type: 'nickname', nickname: '바꿈' })).toEqual({ ok: false, error: 'busy' });
  expect(applyMessage(playing, 'a', { type: 'map', index: 1 })).toEqual({ ok: false, error: 'busy' });
  expect(applyMessage(playing, 'a', { type: 'addNames', text: '훈이' })).toEqual({ ok: false, error: 'busy' });
  expect(applyMessage(playing, 'b', { type: 'end' })).toEqual({ ok: false, error: 'notHost' });

  const ended = ok(applyMessage(playing, 'a', { type: 'end' }));
  expect(ended.phase).toBe('waiting');
  expect(ended.roster).toEqual([]);
  expect(ended.round).toBe(1);
});

test('경기 중에 방장이 빠지면 그 판은 없던 것으로 하고, 참가자가 빠지면 그대로 간다', () => {
  const playing = ok(applyMessage(roomReadyToStart(), 'a', { type: 'start', names: ['민수', '영희', '철수', '민수'] }));

  expect(drop(playing, 'b').phase).toBe('playing');
  const hostGone = drop(playing, 'a');
  expect(hostGone.phase).toBe('waiting');
  expect(hostGone.hostId).toBe('b');
  expect(hostGone.roster).toEqual([]);
});

test('방장은 대기실에서 연결된 사람에게 방장 자리를 넘긴다', () => {
  const state = roomOfTwo();

  expect(ok(applyMessage(state, 'a', { type: 'transfer', memberId: 'b' })).hostId).toBe('b');
  expect(applyMessage(state, 'b', { type: 'transfer', memberId: 'b' })).toEqual({ ok: false, error: 'notHost' });
  expect(applyMessage(leave(state, 'b'), 'a', { type: 'transfer', memberId: 'b' }).ok).toBe(false);
  expect(applyMessage(state, 'a', { type: 'transfer', memberId: 'nobody' }).ok).toBe(false);

  const playing = ok(applyMessage(roomReadyToStart(), 'a', { type: 'start', names: ['민수', '영희', '철수', '민수'] }));
  expect(applyMessage(playing, 'a', { type: 'transfer', memberId: 'b' })).toEqual({ ok: false, error: 'busy' });
});

test('방장은 다른 사람을 내보내고, 자기 자신은 내보내지 못한다', () => {
  const state = roomReadyToStart();

  const kicked = ok(applyMessage(state, 'a', { type: 'kick', memberId: 'b' }));
  expect(kicked.members.map((member) => member.id)).toEqual(['a']);
  expect(roomMarbles(kicked).map((entry) => entry.name)).toEqual(['철수', '민수']);
  expect(applyMessage(state, 'a', { type: 'kick', memberId: 'a' }).ok).toBe(false);
  expect(applyMessage(state, 'b', { type: 'kick', memberId: 'a' })).toEqual({ ok: false, error: 'notHost' });
  expect(applyMessage(state, 'a', { type: 'kick', memberId: 'nobody' }).ok).toBe(false);
});

test('끝난 판의 순위는 이번 판 구슬이 한 번씩 들어 있어야 남는다', () => {
  const playing = ok(applyMessage(roomReadyToStart(), 'a', { type: 'start', names: ['민수', '영희', '철수', '민수'] }));

  expect(rankedNames(playing, [2, 0, 3, 1])).toEqual(['철수', '민수', '민수', '영희']);
  expect(rankedNames(playing, [2, 0, 3])).toBeNull();
  expect(rankedNames(playing, [2, 0, 3, 3])).toBeNull();
  expect(rankedNames(playing, [2, 0, 3, 4])).toBeNull();

  expect(ok(applyMessage(playing, 'a', { type: 'result', ranks: [2, 0, 3, 1] })).resultRound).toBe(1);
  expect(applyMessage(playing, 'a', { type: 'result', ranks: [0, 0, 0, 0] }).ok).toBe(false);
  expect(applyMessage(playing, 'b', { type: 'result', ranks: [2, 0, 3, 1] })).toEqual({ ok: false, error: 'notHost' });
  expect(applyMessage(roomReadyToStart(), 'a', { type: 'result', ranks: [] }).ok).toBe(false);
});

test('결과 링크의 값을 만들고 읽는다', () => {
  expect(resultId('ABCD23', 7)).toBe('ABCD23-7');
  expect(readResultId('?result=abcd23-7')).toEqual({ code: 'ABCD23', round: 7 });
  expect(readResultId('?result=ABCD23-0')).toBeNull();
  expect(readResultId('?result=ABCD23')).toBeNull();
  expect(readResultId('?result=ABC-1')).toBeNull();
  expect(readResultId('?room=ABCD23')).toBeNull();
});

test('응원은 목록 안의 순번만 받는다', () => {
  expect(parseClientMessage('{"type":"cheer","emoji":0}')).toEqual({ type: 'cheer', emoji: 0 });
  expect(parseClientMessage(`{"type":"cheer","emoji":${CHEERS.length}}`)).toBeNull();
  expect(parseClientMessage('{"type":"cheer","emoji":"👏"}')).toBeNull();
  expect(parseClientMessage('{"type":"kick","memberId":"abc"}')).toEqual({ type: 'kick', memberId: 'abc' });
  expect(parseClientMessage('{"type":"result","ranks":[1,0]}')).toEqual({ type: 'result', ranks: [1, 0] });
  expect(parseClientMessage('{"type":"result","ranks":[1,"0"]}')).toBeNull();
});
