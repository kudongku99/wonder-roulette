export type Screen = 'lobby' | 'mapSelect' | 'game' | 'running' | 'result';

/** 화면마다 갈 수 있는 다음 화면 */
const TRANSITIONS: Record<Screen, Screen[]> = {
  lobby: ['mapSelect'],
  mapSelect: ['lobby', 'game'],
  game: ['mapSelect', 'running'],
  running: ['result'],
  result: ['game', 'lobby'],
};

/**
 * 화면 상태 머신. 허용된 전환만 받아들이고, 바뀔 때마다 듣는 쪽에 이전 화면과 새 화면을 알린다.
 */
export class ScreenMachine {
  private _current: Screen;
  private _listeners: ((next: Screen, previous: Screen) => void)[] = [];

  constructor(initial: Screen = 'lobby') {
    this._current = initial;
  }

  get current(): Screen {
    return this._current;
  }

  onChange(listener: (next: Screen, previous: Screen) => void) {
    this._listeners.push(listener);
  }

  /** @returns 화면이 바뀌었으면 true. 지금 화면에서 갈 수 없는 화면이면 아무 일도 하지 않고 false */
  go(next: Screen): boolean {
    if (!TRANSITIONS[this._current].includes(next)) return false;
    const previous = this._current;
    this._current = next;
    for (const listener of this._listeners) listener(next, previous);
    return true;
  }
}
