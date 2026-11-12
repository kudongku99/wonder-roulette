import { stages } from '../data/maps';
import { Hud } from '../hud/hud';
import type { Roulette } from '../roulette';
import { SettingsStore } from '../settings';
import { GameControls } from './gameControls';
import { Lobby } from './lobby';
import { MapSelect } from './mapSelect';
import { toEntryStrings } from './nameList';
import { type Screen, ScreenMachine } from './screenMachine';
import { SettingsPanel } from './settingsPanel';
import { loadMapIndex, loadNames, saveMapIndex, saveNames } from './storage';

/**
 * 화면 흐름: 로비 → 맵 선택 → 게임 화면 → 진행 → 결과.
 * 화면 전환은 ScreenMachine 이 허용한 것만 일어나고, 여기서는 화면이 바뀔 때 보여 줄 것과 게임에 시킬 일을 정한다.
 */
export function startApp(root: HTMLElement, roulette: Roulette) {
  const machine = new ScreenMachine('lobby');
  let mapIndex = loadMapIndex(stages.length);

  /** 지금 이름 목록으로 구슬을 출발 배치에 새로 놓는다 */
  const placeMarbles = () => roulette.setMarbles(toEntryStrings(lobby.list));

  const lobby = new Lobby(
    loadNames(),
    (list) => {
      saveNames(toEntryStrings(list));
      roulette.setLobby(list);
    },
    () => machine.go('mapSelect')
  );
  const mapSelect = new MapSelect(
    stages,
    (index) => {
      mapIndex = index;
      saveMapIndex(index);
      roulette.setMap(index);
      placeMarbles();
      machine.go('game');
    },
    () => machine.go('lobby')
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
      if (machine.go('game')) placeMarbles();
    },
    toLobby: () => {
      machine.go('lobby');
    },
  });
  const settings = new SettingsStore();
  settings.subscribe((value) => roulette.applySettings(value));
  root.append(lobby.node, mapSelect.node, controls.node, new SettingsPanel(settings).node);

  roulette.onFrame((frame) => hud.update(frame));
  roulette.addEventListener('winner', () => machine.go('result'));

  const show = (screen: Screen, previous?: Screen) => {
    // 로비에 들어오면 저장된 이름만큼 구슬이 박스로 쏟아지고, 떠나면 박스를 비운다
    if (screen === 'lobby') roulette.setLobby(lobby.list);
    else if (previous === 'lobby') roulette.setLobby(null);

    root.dataset.screen = screen;
    lobby.node.hidden = screen !== 'lobby';
    mapSelect.node.hidden = screen !== 'mapSelect';
    controls.node.hidden = screen !== 'game';
    hud.setVisible(screen === 'game' || screen === 'running' || screen === 'result');
    if (screen === 'lobby') lobby.focus();
    if (screen === 'mapSelect') mapSelect.show(mapIndex);
    if (screen === 'game') controls.focus();
  };
  machine.onChange(show);
  show(machine.current);
}
