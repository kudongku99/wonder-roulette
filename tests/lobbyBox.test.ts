import { expect, test } from 'vitest';
import type { IPhysics } from '../src/IPhysics';
import { LobbyBox } from '../src/lobbyBox';

/** 구슬을 만든 자리에 그대로 두는 가짜 물리. 만들고 지운 구슬을 기록한다 */
function fakePhysics() {
  const alive = new Map<number, { x: number; y: number; angle: number }>();
  const log = { created: 0, removed: [] as number[], started: 0, cleared: 0 };
  const physics = {
    createStage() {},
    createMarble(id: number, x: number, y: number) {
      alive.set(id, { x, y, angle: 0 });
      log.created++;
    },
    removeMarble(id: number) {
      alive.delete(id);
      log.removed.push(id);
    },
    clearMarbles() {
      alive.clear();
      log.cleared++;
    },
    getMarblePosition: (id: number) => alive.get(id) ?? { x: 0, y: 0, angle: 0 },
    getEntities: () => [],
    start() {
      log.started++;
    },
    step() {},
  } as unknown as IPhysics;
  return { physics, log, alive };
}

const VIEW = { x: 800, y: 450 };

test('이름마다 개수만큼 구슬을 떨어뜨린다', () => {
  const { physics, log } = fakePhysics();
  const box = new LobbyBox(physics);

  box.setEntries([
    { name: 'a', count: 1 },
    { name: 'b', count: 3 },
  ]);

  expect(log.created).toBe(4);
  expect(log.started).toBe(1);
  expect(box.count).toBe(4);
  expect(box.frame(VIEW, 30).marbles).toHaveLength(4);
});

test('이미 있는 구슬은 그대로 두고 늘어난 만큼만 더 떨어뜨린다', () => {
  const { physics, log } = fakePhysics();
  const box = new LobbyBox(physics);
  box.setEntries([{ name: 'a', count: 2 }]);

  box.setEntries([
    { name: 'a', count: 3 },
    { name: 'b', count: 1 },
  ]);

  expect(log.created).toBe(4);
  expect(log.removed).toEqual([]);
});

test('목록에서 빠진 이름의 구슬은 줄어들다가 사라진다', () => {
  const { physics, log } = fakePhysics();
  const box = new LobbyBox(physics);
  box.setEntries([
    { name: 'a', count: 2 },
    { name: 'b', count: 1 },
  ]);

  box.setEntries([{ name: 'b', count: 1 }]);
  expect(box.count).toBe(1);

  box.step(100);
  const shrinking = box.frame(VIEW, 30).marbles.filter((marble) => (marble.scale ?? 1) < 1);
  expect(shrinking).toHaveLength(2);
  expect(log.removed).toEqual([]);

  box.step(500);
  expect(log.removed).toHaveLength(2);
  expect(box.frame(VIEW, 30).marbles).toHaveLength(1);
});

test('구슬 색은 전체가 색상환을 한 바퀴 돌게 나눈다', () => {
  const { physics } = fakePhysics();
  const box = new LobbyBox(physics);

  box.setEntries([
    { name: 'a', count: 2 },
    { name: 'b', count: 2 },
  ]);

  expect(box.frame(VIEW, 30).marbles.map((marble) => marble.hue)).toEqual([0, 90, 180, 270]);
});

test('비우면 구슬이 남지 않는다', () => {
  const { physics, log } = fakePhysics();
  const box = new LobbyBox(physics);
  box.setEntries([{ name: 'a', count: 5 }]);

  box.clear();

  expect(log.cleared).toBe(1);
  expect(box.count).toBe(0);
});

test('가로로 넓은 화면에서는 박스가 오른쪽에 오도록 카메라를 왼쪽으로 옮긴다', () => {
  const { physics } = fakePhysics();
  const box = new LobbyBox(physics);

  const wide = box.frame({ x: 800, y: 450 }, 30).camera;
  const tall = box.frame({ x: 640, y: 1386 }, 30).camera;

  expect(tall.x).toBe(13);
  expect(wide.x).toBeLessThan(13);
});

test('넓은 화면에서 확대·축소해도 박스는 화면의 같은 자리에 머문다', () => {
  const { physics } = fakePhysics();
  const box = new LobbyBox(physics);
  const view = { x: 800, y: 450 };
  /** 박스 가운데(x = 13) 가 화면 가운데에서 몇 픽셀 떨어져 그려지는지. 렌더러는 줌에 사용자 배율을 곱해 그린다 */
  const offset = (userZoom: number) => {
    const { camera } = box.frame(view, 30, userZoom);
    return (13 - camera.x) * 30 * camera.zoom * userZoom;
  };

  expect(offset(1)).toBeGreaterThan(0);
  expect(offset(2)).toBeCloseTo(offset(1));
  expect(offset(0.5)).toBeCloseTo(offset(1));
});
