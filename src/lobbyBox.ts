import type { StageDef } from './data/maps';
import type { IPhysics } from './IPhysics';
import type { MarbleBody, WorldFrame } from './render/worldFrame';
import type { VectorLike } from './types/VectorLike';

/** 박스 안쪽의 좌우 끝과 바닥, 벽 위쪽 끝 (물리 좌표, y 가 아래로 증가) */
const BOX = { left: 8.5, right: 17.5, top: 3, floor: 11 };
/** 구슬이 떨어지기 시작하는 높이. 한꺼번에 넣으면 이 간격으로 위로 줄을 세워 차례로 쏟아지게 한다 */
const DROP_Y = 0;
const DROP_SPACING = 0.35;
/** 지운 구슬이 줄어들며 사라지는 시간 (ms) */
const LEAVE_MS = 220;
/** 화면에 담을 세로 범위 (구슬이 떨어지는 곳부터 바닥 아래까지) */
const VIEW_TOP = -1.5;
const VIEW_BOTTOM = 12.5;
/** 화면이 이 비율보다 가로로 넓으면 이름 입력 카드가 왼쪽에 오므로 박스를 오른쪽으로 민다 */
const WIDE_ASPECT = 1.25;

const LOBBY_STAGE: StageDef = {
  title: 'lobby',
  goalY: BOX.floor,
  zoomY: BOX.floor,
  entities: [
    {
      type: 'static',
      position: { x: 0, y: 0 },
      shape: {
        type: 'polyline',
        rotation: 0,
        points: [
          [BOX.left - 0.8, BOX.top - 1],
          [BOX.left, BOX.top],
          [BOX.left, BOX.floor],
          [BOX.right, BOX.floor],
          [BOX.right, BOX.top],
          [BOX.right + 0.8, BOX.top - 1],
        ],
      },
      props: { density: 1, restitution: 0, angularVelocity: 0 },
    },
  ],
};

export type LobbyEntry = { name: string; count: number };

type LobbyMarble = MarbleBody & {
  id: number;
  name: string;
  scale: number;
  /** 지워지는 중이면 남은 시간 (ms), 아니면 null */
  leaving: number | null;
};

/**
 * 로비 화면의 장식. 이름을 넣으면 구슬이 박스로 떨어지고, 지우면 그 구슬이 줄어들며 사라진다.
 * 게임과는 다른 물리 월드를 쓰고 추첨에는 관여하지 않는다. 게임은 시작할 때 구슬을 출발 배치로 새로 만든다.
 */
export class LobbyBox {
  private _marbles: LobbyMarble[] = [];
  private _nextId = 0;

  /** @param physics 게임 월드와 다른 인스턴스. init 은 이미 끝나 있어야 한다 */
  constructor(private physics: IPhysics) {
    physics.createStage(LOBBY_STAGE);
  }

  get count() {
    return this._marbles.filter((marble) => marble.leaving === null).length;
  }

  /**
   * 박스 안의 구슬을 이름 목록에 맞춘다. 늘어난 만큼 새로 떨어뜨리고, 목록에서 빠진 이름의 구슬은 사라지게 한다.
   * 이미 있는 구슬은 그대로 둔다.
   */
  setEntries(entries: LobbyEntry[]) {
    const wanted = new Map(entries.map((entry) => [entry.name, entry.count]));
    const have = new Map<string, number>();
    for (const marble of this._marbles) {
      if (marble.leaving !== null) continue;
      const seen = have.get(marble.name) ?? 0;
      if (seen < (wanted.get(marble.name) ?? 0)) {
        have.set(marble.name, seen + 1);
      } else {
        marble.leaving = LEAVE_MS;
      }
    }

    let dropped = 0;
    for (const entry of entries) {
      for (let i = have.get(entry.name) ?? 0; i < entry.count; i++) {
        const id = this._nextId++;
        const x = BOX.left + 1 + Math.random() * (BOX.right - BOX.left - 2);
        this.physics.createMarble(id, x, DROP_Y - dropped++ * DROP_SPACING);
        this._marbles.push({
          id,
          name: entry.name,
          position: { x, y: DROP_Y, angle: 0 },
          hue: 0,
          scale: 1,
          leaving: null,
        });
      }
    }
    if (dropped > 0) this.physics.start();
    this.assignHues(entries);
  }

  /** 박스를 비운다 */
  clear() {
    this.physics.clearMarbles();
    this._marbles = [];
  }

  /** @param deltaMs 지난 시간 (ms) */
  step(deltaMs: number) {
    this.physics.step(deltaMs / 1000);
    for (const marble of this._marbles) {
      if (marble.leaving !== null) {
        marble.leaving -= deltaMs;
        marble.scale = Math.max(0, marble.leaving / LEAVE_MS);
        if (marble.leaving <= 0) this.physics.removeMarble(marble.id);
      }
      if (marble.leaving === null || marble.leaving > 0) {
        marble.position = this.physics.getMarblePosition(marble.id);
      }
    }
    this._marbles = this._marbles.filter((marble) => marble.leaving === null || marble.leaving > 0);
  }

  /** @param viewSize 보이는 월드 범위의 기준이 되는 화면 크기 (renderer.viewSize) */
  frame(viewSize: VectorLike, initialZoom: number): WorldFrame {
    const zoom = viewSize.y / initialZoom / (VIEW_BOTTOM - VIEW_TOP);
    const visibleWidth = viewSize.x / (initialZoom * zoom);
    const centerX = (BOX.left + BOX.right) / 2;
    const wide = viewSize.x / viewSize.y > WIDE_ASPECT;
    return {
      camera: { x: wide ? centerX - visibleWidth * 0.22 : centerX, y: (VIEW_TOP + VIEW_BOTTOM) / 2, zoom },
      stage: LOBBY_STAGE,
      entities: this.physics.getEntities(),
      marbles: this._marbles,
      bursts: [],
      floor: false,
      fixedView: true,
    };
  }

  /** 게임에서처럼 전체 구슬이 색상환을 한 바퀴 돌게 한다. 같은 이름의 구슬은 이웃한 색이 된다 */
  private assignHues(entries: LobbyEntry[]) {
    const total = entries.reduce((sum, entry) => sum + entry.count, 0);
    if (total === 0) return;
    let offset = 0;
    for (const entry of entries) {
      let index = 0;
      for (const marble of this._marbles) {
        if (marble.leaving !== null || marble.name !== entry.name) continue;
        marble.hue = (360 / total) * (offset + index++);
      }
      offset += entry.count;
    }
  }
}
