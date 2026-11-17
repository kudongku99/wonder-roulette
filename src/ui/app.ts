import { CameraViewStore } from '../cameraView';
import { stages } from '../data/maps';
import { Hud } from '../hud/hud';
import { stageTitle, t } from '../i18n';
import { readResultId, readRoomCode, resultId } from '../room/protocol';
import { createRoom, fetchResult, RoomClient, roomServerUrl } from '../room/roomClient';
import { type RoomState, roomMarbles } from '../room/roomState';
import type { Roulette } from '../roulette';
import { MAX_MARBLES } from '../utils/utils';
import { GameControls } from './gameControls';
import { Lobby } from './lobby';
import { MapSelect } from './mapSelect';
import { toEntryStrings } from './nameList';
import { ResultView } from './resultView';
import { RoomLobby } from './roomLobby';
import { type Screen, ScreenMachine } from './screenMachine';
import { loadMapIndex, loadNames, loadNickname, roomClientId, saveMapIndex, saveNames, saveNickname } from './storage';
import { attachViewControls } from './viewControls';

/** 초대방에서 방장이 시작을 누른 뒤 출발까지의 시간 (ms) */
const COUNTDOWN_MS = 3000;

/** 들어가 있는 초대방. state 와 memberId 는 서버의 첫 응답이 와야 채워진다 */
type RoomSession = {
  client: RoomClient;
  state: RoomState | null;
  memberId: string | null;
  /** 이 화면이 따라가고 있는 판 번호. 아직 없으면 -1 */
  round: number;
  /** 방장으로서 시작을 요청하고 서버의 답을 기다리는 중 */
  starting: boolean;
};

/** 주소 표시줄의 `?room=코드` 를 넣거나 뺀다. 새로고침하면 같은 방으로 돌아온다 */
function setRoomInUrl(code: string | null) {
  const url = new URL(location.href);
  if (code) url.searchParams.set('room', code);
  else url.searchParams.delete('room');
  history.replaceState(null, '', url);
}

/** 이 사이트의 주소에 값 하나만 붙인 링크. 초대 링크(`room`) 와 결과 링크(`result`) 에 쓴다 */
function linkWith(key: 'room' | 'result', value: string): string {
  const url = new URL(location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set(key, value);
  return url.href;
}

/**
 * 화면 흐름: 로비 → 맵 선택 → 게임 화면 → 진행 → 결과.
 * 초대방은 로비에서 만들거나 `?room=코드` 주소로 들어오고, 대기실 ⇄ 맵 선택(방장) 사이를 오간다.
 * `?result=코드-판` 주소로 들어오면 끝난 판의 순위표만 보여 준다.
 * 화면 전환은 ScreenMachine 이 허용한 것만 일어나고, 여기서는 화면이 바뀔 때 보여 줄 것과 게임에 시킬 일을 정한다.
 */
export function startApp(root: HTMLElement, roulette: Roulette) {
  const serverUrl = roomServerUrl();
  const sharedResult = serverUrl ? readResultId(location.search) : null;
  const invitedCode = serverUrl && !sharedResult ? readRoomCode(location.search) : null;
  const machine = new ScreenMachine(sharedResult ? 'shared' : invitedCode ? 'room' : 'lobby');
  let mapIndex = loadMapIndex(stages.length);
  let room: RoomSession | null = null;

  /** 방이 고른 맵. 이 빌드에 없는 번호면 마지막 맵으로 본다 */
  const roomMapIndex = (state: RoomState) => Math.min(state.mapIndex, stages.length - 1);

  const isHost = () => !!room?.state && room.state.hostId === room.memberId;

  const leaveRoom = (notice?: string) => {
    room?.client.send({ type: 'leave' });
    room?.client.close();
    room = null;
    setRoomInUrl(null);
    roulette.setBroadcast(0, null);
    hud.setMode('solo');
    if (!machine.go('lobby')) {
      machine.go('room');
      machine.go('lobby');
    }
    if (notice) lobby.notify(notice);
  };

  /** 대기실이나 지난 판의 결과 화면에서 새 판의 게임 화면으로 간다 */
  const enterGame = () => {
    if (machine.go('game')) return;
    machine.go('room');
    machine.go('game');
  };

  /**
   * 방장이 새 판을 연다. 구슬을 섞어 놓고 그 순서를 서버에 알린다. 서버가 받아들이면 방 상태의 판 번호가 오르고,
   * 그때 모두 같이 게임 화면으로 넘어간다
   */
  const requestStart = () => {
    if (!room?.state || !isHost()) return;
    roulette.setBroadcast(0, null);
    roulette.setMap(roomMapIndex(room.state));
    roulette.setMarbles(toEntryStrings(roomMarbles(room.state)));
    room.starting = true;
    room.client.send({ type: 'start', names: roulette.roster });
  };

  /** 방 상태가 바뀔 때마다 판의 진행을 맞춘다 */
  const followRound = (session: RoomSession, state: RoomState, memberId: string) => {
    const hosting = state.hostId === memberId;
    if (state.phase === 'waiting') {
      if (machine.current === 'game' || machine.current === 'running' || machine.current === 'result') {
        roulette.setBroadcast(0, null);
        machine.go('room');
      }
      return;
    }
    if (session.round === state.round) return;
    session.round = state.round;
    if (!hosting) {
      roulette.setMap(roomMapIndex(state));
      roulette.watch(state.roster);
      enterGame();
    } else if (session.starting) {
      roulette.setBroadcast(state.round, (snapshot) => session.client.sendSnapshot(snapshot));
      enterGame();
      roulette.startAfter(COUNTDOWN_MS);
    } else {
      // 방장인데 돌리고 있는 판이 없다 (경기 중에 새로고침했다). 그 판은 없던 것으로 하고 대기실로 돌아간다
      session.client.send({ type: 'end' });
    }
    session.starting = false;
  };

  const enterRoom = (url: string, code: string) => {
    roomLobby.open(code, linkWith('room', code));
    setRoomInUrl(code);
    const session: RoomSession = {
      state: null,
      memberId: null,
      round: -1,
      starting: false,
      client: new RoomClient(url, code, roomClientId(), {
        onState: (state, memberId) => {
          if (room !== session) return;
          session.state = state;
          session.memberId = memberId;
          const nickname = state.members.find((member) => member.id === memberId)?.nickname;
          if (nickname) saveNickname(nickname);
          roomLobby.update({ state, memberId, mapTitle: stageTitle(stages[roomMapIndex(state)].title) });
          if (machine.current === 'room') roulette.setLobby(roomMarbles(state));
          // 맵을 고르던 중에 방장이 아니게 됐으면 대기실로 돌아간다
          if (machine.current === 'mapSelect' && state.hostId !== memberId) machine.go('room');
          hud.setMode(state.hostId === memberId ? 'host' : 'guest');
          const kept = state.phase === 'playing' && state.resultRound === state.round;
          hud.setResultLink(kept ? linkWith('result', resultId(state.code, state.round)) : null);
          followRound(session, state, memberId);
        },
        onSnapshot: (snapshot) => {
          if (room === session && snapshot.r === session.round && !isHost()) roulette.pushSnapshot(snapshot);
        },
        onCheer: (memberId, emoji) => {
          if (room !== session) return;
          hud.showCheer(emoji, session.state?.members.find((member) => member.id === memberId)?.nickname ?? '');
        },
        onStatus: (status) => {
          if (room === session) roomLobby.setStatus(status);
        },
        onRejected: (names) => {
          if (room === session) roomLobby.notify(t('lobby.limit', { max: MAX_MARBLES, names: names.join(', ') }));
        },
        onError: (error) => {
          if (room !== session) return;
          if (error === 'marblesFull') roomLobby.notify(t('room.marblesFull'));
          if (session.starting) {
            session.starting = false;
            roomLobby.notify(t('room.startFailed'));
          }
        },
        onEnd: (reason) => {
          if (room === session) leaveRoom(t(`room.${reason}`));
        },
      }),
    };
    room = session;
    session.client.connect();
  };

  /** 지금 이름 목록으로 구슬을 출발 배치에 새로 놓는다 */
  const placeMarbles = () => roulette.setMarbles(toEntryStrings(lobby.list));

  const lobby = new Lobby(
    loadNames(),
    (list) => {
      saveNames(toEntryStrings(list));
      roulette.setLobby(list);
    },
    () => machine.go('mapSelect'),
    serverUrl
      ? async () => {
          try {
            enterRoom(serverUrl, await createRoom(serverUrl));
            machine.go('room');
          } catch {
            lobby.notify(t('lobby.inviteFailed'));
          }
        }
      : undefined
  );
  const roomLobby = new RoomLobby(
    {
      setNickname: (nickname) => room?.client.send({ type: 'nickname', nickname }),
      addNames: (text) => room?.client.send({ type: 'addNames', text }),
      removeName: (name) => room?.client.send({ type: 'removeName', name }),
      chooseMap: () => machine.go('mapSelect'),
      start: requestStart,
      transfer: (memberId) => room?.client.send({ type: 'transfer', memberId }),
      kick: (memberId) => room?.client.send({ type: 'kick', memberId }),
      leave: () => leaveRoom(),
    },
    loadNickname()
  );
  const mapSelect = new MapSelect(
    stages,
    (index) => {
      if (room) {
        room.client.send({ type: 'map', index });
        machine.go('room');
        return;
      }
      mapIndex = index;
      saveMapIndex(index);
      roulette.setMap(index);
      placeMarbles();
      machine.go('game');
    },
    () => machine.go(room ? 'room' : 'lobby')
  );
  const controls = new GameControls({
    toMaps: () => machine.go('mapSelect'),
    shuffle: placeMarbles,
    start: () => {
      if (machine.go('running')) roulette.start();
    },
  });
  const hud = new Hud(root, {
    setFastForward: (on) => roulette.setFastForward(on),
    lookAt: (pos) => roulette.lookAt(pos),
    replay: () => {
      if (room) requestStart();
      else if (machine.go('game')) placeMarbles();
    },
    toLobby: () => {
      if (!room) machine.go('lobby');
      else if (isHost()) room.client.send({ type: 'end' });
      else leaveRoom();
    },
    cheer: (emoji) => room?.client.send({ type: 'cheer', emoji }),
  });
  const resultView = new ResultView(() => {
    const url = new URL(location.href);
    url.searchParams.delete('result');
    history.replaceState(null, '', url);
    machine.go('lobby');
  });
  const cameraView = new CameraViewStore();
  cameraView.subscribe((view) => roulette.setCameraView(view));
  attachViewControls(roulette.canvas, cameraView);
  root.append(lobby.node, roomLobby.node, mapSelect.node, controls.node, resultView.node);

  roulette.onFrame((frame) => hud.update(frame));
  roulette.addEventListener('started', () => machine.go('running'));
  roulette.addEventListener('winner', () => machine.go('result'));
  // 초대방의 방장은 모든 순위가 정해지면 그 순위를 서버에 남긴다. 결과 링크로 다시 볼 수 있게 된다
  roulette.addEventListener('finish', () => {
    if (room?.state?.phase === 'playing' && isHost()) room.client.send({ type: 'result', ranks: roulette.ranking });
  });

  const show = (screen: Screen, previous?: Screen) => {
    // 로비에 들어오면 저장된 이름만큼 구슬이 박스로 쏟아지고, 떠나면 박스를 비운다
    if (screen === 'lobby') roulette.setLobby(lobby.list);
    else if (screen === 'room') roulette.setLobby(room?.state ? roomMarbles(room.state) : []);
    else if (screen === 'shared') roulette.setLobby([]);
    else if (previous === 'lobby' || previous === 'room') roulette.setLobby(null);

    root.dataset.screen = screen;
    lobby.node.hidden = screen !== 'lobby';
    roomLobby.node.hidden = screen !== 'room';
    mapSelect.node.hidden = screen !== 'mapSelect';
    resultView.node.hidden = screen !== 'shared';
    // 초대방의 게임 화면은 카운트다운만 보인다. 맵 선택·섞기·시작은 혼자 할 때의 버튼이다
    controls.node.hidden = screen !== 'game' || room !== null;
    hud.setVisible(screen === 'game' || screen === 'running' || screen === 'result');
    if (screen === 'lobby') lobby.focus();
    if (screen === 'room') roomLobby.focus();
    if (screen === 'mapSelect') mapSelect.show(room?.state ? roomMapIndex(room.state) : mapIndex);
    if (screen === 'game') controls.focus();
  };
  machine.onChange(show);
  if (serverUrl && invitedCode) enterRoom(serverUrl, invitedCode);
  if (serverUrl && sharedResult) {
    fetchResult(serverUrl, sharedResult.code, sharedResult.round).then(
      (result) => {
        if (result) resultView.show(result, stageTitle(stages[Math.min(result.mapIndex, stages.length - 1)].title));
        else resultView.missing();
      },
      () => resultView.missing()
    );
  }
  show(machine.current);
}
