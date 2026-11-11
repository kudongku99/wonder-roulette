import type { VectorLike } from './types/VectorLike';

const lifetime = 2200;
let nextSeed = 1;

/** 당첨 구슬이 골인한 자리에서 터지는 축하 효과 */
export class GoalBurst {
  position: VectorLike;
  /** 색 (0 ~ 360). 골인한 구슬의 색을 쓴다 */
  hue: number;
  /** 파티클 배치를 정하는 값. 같은 값이면 같은 모양으로 터진다 */
  readonly seed: number;
  isDestroy: boolean = false;
  private _elapsed: number = 0;

  constructor(x: number, y: number, hue: number) {
    this.position = { x, y };
    this.hue = hue;
    this.seed = nextSeed++;
  }

  /** 터진 뒤 지난 시간 (초) */
  get age() {
    return this._elapsed / 1000;
  }

  /** 수명 대비 진행 비율 (0 에서 시작해 1 을 넘으면 사라진다) */
  get progress() {
    return this._elapsed / lifetime;
  }

  update(deltaTime: number) {
    this._elapsed += deltaTime;
    if (this._elapsed > lifetime) {
      this.isDestroy = true;
    }
  }
}
