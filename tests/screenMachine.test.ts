import { expect, test } from 'vitest';
import { type Screen, ScreenMachine } from '../src/ui/screenMachine';

test('로비에서 결과까지 차례로 넘어간다', () => {
  const machine = new ScreenMachine();
  const seen: Screen[] = [];
  machine.onChange((next) => seen.push(next));

  for (const next of ['mapSelect', 'game', 'running', 'result'] as const) expect(machine.go(next)).toBe(true);

  expect(seen).toEqual(['mapSelect', 'game', 'running', 'result']);
});

test('결과에서는 게임 화면이나 로비로 돌아간다', () => {
  const toResult = () => {
    const machine = new ScreenMachine();
    for (const next of ['mapSelect', 'game', 'running', 'result'] as const) machine.go(next);
    return machine;
  };

  expect(toResult().go('game')).toBe(true);
  expect(toResult().go('lobby')).toBe(true);
  expect(toResult().go('mapSelect')).toBe(false);
});

test('게임 화면에서는 맵 선택으로 돌아갈 수 있고, 진행 중에는 결과로만 간다', () => {
  const machine = new ScreenMachine();
  machine.go('mapSelect');
  machine.go('game');
  expect(machine.go('mapSelect')).toBe(true);

  machine.go('game');
  machine.go('running');
  expect(machine.go('game')).toBe(false);
  expect(machine.go('lobby')).toBe(false);
  expect(machine.current).toBe('running');
});

test('갈 수 없는 화면이면 알리지 않고 그대로 있는다', () => {
  const machine = new ScreenMachine();
  let calls = 0;
  machine.onChange(() => calls++);

  expect(machine.go('result')).toBe(false);
  expect(machine.current).toBe('lobby');
  expect(calls).toBe(0);
});
