import {
  Color,
  DoubleSide,
  Euler,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  PlaneGeometry,
  Quaternion,
  SRGBColorSpace,
  Vector3,
} from 'three';
import type { GoalBurst } from '../../goalBurst';

export const PARTICLES_PER_BURST = 120;
const MAX_BURSTS = 8;
/** 물리 좌표에서 아래로 떨어지는 가속도 (월드 단위 / 초²) */
const GRAVITY = 9;
const HUE_SPREAD = 70;

/** 시드가 같으면 같은 수열을 내는 난수 (mulberry32) */
function seededRandom(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 골인 축하 종이 조각. 물리 좌표를 그대로 쓰므로 mesh 를 y 를 뒤집는 부모 아래에 붙여야 한다.
 * 조각의 위치는 터진 뒤 지난 시간만으로 계산하므로 프레임 사이에 들고 있는 상태가 없다.
 */
export class ConfettiMeshes {
  readonly mesh: InstancedMesh;
  private _matrix = new Matrix4();
  private _position = new Vector3();
  private _rotation = new Quaternion();
  private _euler = new Euler();
  private _scale = new Vector3();
  private _color = new Color();

  constructor() {
    const material = new MeshBasicMaterial({ side: DoubleSide });
    this.mesh = new InstancedMesh(new PlaneGeometry(0.2, 0.32), material, MAX_BURSTS * PARTICLES_PER_BURST);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
  }

  get count() {
    return this.mesh.count;
  }

  getPosition(index: number, target: Vector3) {
    this.mesh.getMatrixAt(index, this._matrix);
    return target.setFromMatrixPosition(this._matrix);
  }

  sync(bursts: GoalBurst[]) {
    let index = 0;
    // 한꺼번에 많이 터지면 최근 것만 그린다
    for (const burst of bursts.slice(-MAX_BURSTS)) {
      const random = seededRandom(burst.seed);
      const t = burst.age;
      const shrink = Math.min(1, (1 - burst.progress) * 4);
      for (let i = 0; i < PARTICLES_PER_BURST; i++) {
        // 위쪽 부채꼴로 쏘아 올린다 (물리 좌표라 위가 -y)
        const direction = -Math.PI / 2 + (random() - 0.5) * 2.4;
        const speed = 3 + random() * 9;
        const depthSpeed = (random() - 0.5) * 6;
        const spin = (random() - 0.5) * 16;
        const tumble = (random() - 0.5) * 16;
        const hue = burst.hue + (random() - 0.5) * HUE_SPREAD;
        const size = 0.6 + random() * 0.8;

        this._position.set(
          burst.position.x + Math.cos(direction) * speed * t,
          burst.position.y + Math.sin(direction) * speed * t + (GRAVITY * t * t) / 2,
          depthSpeed * t
        );
        this._rotation.setFromEuler(this._euler.set(tumble * t, spin * t, spin * t * 0.5));
        this._scale.setScalar(Math.max(0, size * shrink));
        this._matrix.compose(this._position, this._rotation, this._scale);
        this.mesh.setMatrixAt(index, this._matrix);
        this._color.setHSL((((hue % 360) + 360) % 360) / 360, 0.95, 0.6, SRGBColorSpace);
        this.mesh.setColorAt(index, this._color);
        index++;
      }
    }
    this.mesh.count = index;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}
