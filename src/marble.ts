import { Skills, STUCK_DELAY } from './data/constants';
import type { IPhysics } from './IPhysics';
import options from './options';
import type { VectorLike } from './types/VectorLike';
import { Vector } from './utils/Vector';

export class Marble {
  type = 'marble' as const;
  name: string = '';
  size: number = 0.5;
  color: string = 'red';
  hue: number = 0;
  impact: number = 0;
  weight: number = 1;
  skill: Skills = Skills.None;
  isActive: boolean = false;

  private _skillRate = 0.0005;
  private _coolTime = 5000;
  private _maxCoolTime = 5000;
  private _stuckTime = 0;
  private lastPosition: VectorLike = { x: 0, y: 0 };

  private physics: IPhysics;

  id: number;

  get position() {
    return this.physics.getMarblePosition(this.id) || { x: 0, y: 0, angle: 0 };
  }

  get x() {
    return this.position.x;
  }

  set x(v: number) {
    this.position.x = v;
  }

  get y() {
    return this.position.y;
  }

  set y(v: number) {
    this.position.y = v;
  }

  get angle() {
    return this.position.angle;
  }

  /** 스킬 쿨타임이 남은 비율 (0 ~ 1) */
  get coolTimeRatio() {
    return this._coolTime / this._maxCoolTime;
  }

  constructor(physics: IPhysics, order: number, max: number, name?: string, weight: number = 1) {
    this.name = name || `M${order}`;
    this.weight = weight;
    this.physics = physics;

    this._maxCoolTime = 1000 + (1 - this.weight) * 4000;
    this._coolTime = this._maxCoolTime * Math.random();
    this._skillRate = 0.2 * this.weight;

    const maxLine = Math.ceil(max / 10);
    const line = Math.floor(order / 10);
    const lineDelta = -Math.max(0, Math.ceil(maxLine - 5));
    this.hue = (360 / max) * order;
    this.color = `hsl(${this.hue} 100% 70%)`;
    this.id = order;

    physics.createMarble(order, 10.25 + (order % 10) * 0.6, maxLine - line + lineDelta);
  }

  /**
   * @param deltaTime 벽시계 기준 경과(ms). 스킬 쿨타임 등 연출 시간에 쓴다
   * @param timeScale 이 틱에서 물리가 실제로 진행된 비율(슬로모션이면 1 미만).
   *   정지 판정은 이동 거리로 하므로 물리 시간에 맞춰 문턱을 줄여야 한다. 안 그러면 슬로모션 중
   *   천천히 구르는 구슬이 멈춘 것으로 오판되어 골인 직전에 랜덤으로 튕겨진다
   */
  update(deltaTime: number, timeScale: number = 1) {
    const stuckThreshold = 0.00001 * timeScale * timeScale;
    if (this.isActive && Vector.lenSq(Vector.sub(this.lastPosition, this.position)) < stuckThreshold) {
      // 누적에는 timeScale 을 곱하지 않는다. 이건 화면이 굳는 걸 막는 워치독이라 관객 체감 시간이 기준이다.
      // 물리 시간으로 바꾸면 슬로모션이 깊을수록 발동이 늦어지는데, 타겟 구슬이 멈추면 _goalDist 가 고정되어
      // 슬로모션이 풀리지 않으므로 교착을 깨야 할 상황에서 워치독이 오히려 무뎌진다
      this._stuckTime += deltaTime;

      if (this._stuckTime > STUCK_DELAY) {
        this.physics.shakeMarble(this.id);
        this._stuckTime = 0;
      }
    } else {
      this._stuckTime = 0;
    }
    this.lastPosition = { x: this.position.x, y: this.position.y };

    this.skill = Skills.None;
    if (this.impact) {
      this.impact = Math.max(0, this.impact - deltaTime);
    }
    if (!this.isActive) return;
    if (options.useSkills) {
      this._updateSkillInformation(deltaTime);
    }
  }

  private _updateSkillInformation(deltaTime: number) {
    if (this._coolTime > 0) {
      this._coolTime -= deltaTime;
    }

    if (this._coolTime <= 0) {
      this.skill = Math.random() < this._skillRate ? Skills.Impact : Skills.None;
      this._coolTime = this._maxCoolTime;
    }
  }
}
