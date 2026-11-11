import type { VectorLike } from './types/VectorLike';

const lifetime = 500;

export class SkillEffect {
  size: number = 0;
  position: VectorLike;
  private _elapsed: number = 0;
  isDestroy: boolean = false;

  constructor(x: number, y: number) {
    this.position = { x, y };
  }

  /** 수명 대비 진행 비율 (0 에서 시작해 1 을 넘으면 사라진다) */
  get progress() {
    return this._elapsed / lifetime;
  }

  update(deltaTime: number) {
    this._elapsed += deltaTime;
    this.size = (this._elapsed / lifetime) * 10;
    if (this._elapsed > lifetime) {
      this.isDestroy = true;
    }
  }
}
