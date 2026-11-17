import { expect, test } from 'vitest';
import type { StageDef } from '../src/data/maps';
import { RENDER_DELAY_MS, RemoteGame, STALL_MS } from '../src/room/remoteGame';
import { encodeSnapshot, parseSnapshot, type Snapshot } from '../src/room/snapshot';

const box = { type: 'box' as const, width: 1, height: 1, rotation: 0 };
const props = { density: 1, restitution: 0, angularVelocity: 0 };

/** 벽 하나, 도는 장애물 하나, 닿으면 부서지는 장애물 하나 */
const STAGE = {
  title: 'test',
  goalY: 100,
  zoomY: 90,
  entities: [
    { position: { x: 0, y: 0 }, type: 'static', shape: { ...box }, props },
    { position: { x: 5, y: 5 }, type: 'kinematic', shape: { ...box }, props: { ...props, angularVelocity: 2 } },
    { position: { x: 9, y: 9 }, type: 'static', shape: { ...box }, props: { ...props, life: 1 } },
  ],
} as StageDef;

function snapshot(t: number, patch: Partial<Snapshot> = {}): Snapshot {
  return { r: 1, t, c: null, m: [], w: [], e: [1, 0, 2, 0], i: 0, f: false, x: false, ...patch };
}

/** 방장 시계와 내 시계가 같고 지연 없이 받는다고 치고, 그릴 순간이 방장 시각 hostTime 이 되는 내 시각 */
const at = (hostTime: number) => hostTime + RENDER_DELAY_MS;

test('앞뒤 스냅샷 사이의 자리를 이어 그린다', () => {
  const game = new RemoteGame(STAGE);
  game.push(snapshot(1000, { m: [0, 10, 20, 0, 1, 0, 0, 0], e: [1, 1, 2, 0] }), 1000);
  game.push(snapshot(1100, { m: [1, 4, 8, 2, 0, 20, 40, 1], e: [1, 2, 2, 0] }), 1100);

  const view = game.sample(at(1050));

  expect(view?.order).toEqual([0, 1]);
  expect(game.getMarblePosition(0)).toEqual({ x: 15, y: 30, angle: 0.5 });
  expect(game.getMarblePosition(1)).toEqual({ x: 2, y: 4, angle: 1 });
  expect(game.getEntities().map((entity) => entity.angle)).toEqual([0, 1.5, 0]);
});

test('다음 스냅샷이 아직 없으면 마지막 자리에 머문다', () => {
  const game = new RemoteGame(STAGE);
  game.push(snapshot(1000, { m: [0, 10, 20, 0] }), 1000);

  game.sample(at(5000));

  expect(game.getMarblePosition(0)).toEqual({ x: 10, y: 20, angle: 0 });
});

test('늦게 도착한 스냅샷이 있어도 가장 빨리 온 것을 기준으로 시각을 맞춘다', () => {
  const game = new RemoteGame(STAGE);
  game.push(snapshot(1000, { m: [0, 0, 0, 0] }), 1300);
  game.push(snapshot(1100, { m: [0, 10, 0, 0] }), 1150);
  game.push(snapshot(1200, { m: [0, 20, 0, 0] }), 1250);

  game.sample(1200 + RENDER_DELAY_MS);

  expect(game.getMarblePosition(0).x).toBeCloseTo(15);
});

test('골인해서 스냅샷에서 빠진 구슬은 마지막으로 본 자리를 돌려준다', () => {
  const game = new RemoteGame(STAGE);
  game.push(snapshot(1000, { m: [0, 1, 99, 0, 1, 2, 50, 0] }), 1000);
  game.push(snapshot(1100, { m: [1, 2, 60, 0], w: [0] }), 1100);

  const view = game.sample(at(1100));

  expect(view?.order).toEqual([1]);
  expect(view?.winners).toEqual([0]);
  expect(game.getMarblePosition(0)).toEqual({ x: 1, y: 99, angle: 0 });
});

test('부서진 장애물은 사라지고 맵 데이터 그대로인 벽은 늘 남는다', () => {
  const game = new RemoteGame(STAGE);
  game.push(snapshot(1000, { e: [1, 3] }), 1000);

  game.sample(at(1000));

  expect(game.getEntities().map((entity) => [entity.x, entity.angle])).toEqual([
    [0, 0],
    [5, 3],
  ]);
});

test('출발 전에는 남은 시간이 줄어들고 출발하면 null 이다', () => {
  const game = new RemoteGame(STAGE);
  game.push(snapshot(1000, { c: 2000 }), 1000);
  expect(game.sample(at(1000))?.countdown).toBe(2000);
  expect(game.sample(at(1400))?.countdown).toBe(1600);

  game.push(snapshot(3100), 3100);
  expect(game.sample(at(3100))?.countdown).toBeNull();
});

test('한동안 소식이 없으면 멈춘 것으로 보고, 모든 순위가 정해진 뒤에는 그렇게 보지 않는다', () => {
  const game = new RemoteGame(STAGE);
  expect(game.sample(0)).toBeNull();

  game.push(snapshot(1000), 1000);
  expect(game.sample(1000 + STALL_MS - 1)?.stalled).toBe(false);
  expect(game.sample(1000 + STALL_MS + 1)?.stalled).toBe(true);

  game.push(snapshot(9000, { x: true }), 9000);
  expect(game.sample(9000 + STALL_MS * 3)?.stalled).toBe(false);
});

test('스냅샷은 보낸 그대로 읽히고 모양이 틀리면 버린다', () => {
  const sent = snapshot(1234, { c: 500, m: [3, 1.5, 2.25, -0.125], w: [1], i: 0.4, f: true });

  expect(parseSnapshot(encodeSnapshot(sent))).toEqual(sent);
  expect(parseSnapshot(JSON.stringify(sent))).toBeNull();
  expect(parseSnapshot(encodeSnapshot({ ...sent, m: [3, 1.5, 2.25] }))).toBeNull();
  expect(parseSnapshot(encodeSnapshot({ ...sent, t: Number.NaN }))).toBeNull();
  expect(parseSnapshot('s{"r":1}')).toBeNull();
  expect(parseSnapshot('snot json')).toBeNull();
});
