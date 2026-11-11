import {
  Color,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  SphereGeometry,
  SRGBColorSpace,
  type Texture,
  Vector3,
} from 'three';
import type { Marble } from '../../marble';
import type { ColorTheme } from '../../types/ColorTheme';

const INITIAL_CAPACITY = 64;
const Z_AXIS = new Vector3(0, 0, 1);
const UNIT_SCALE = new Vector3(1, 1, 1);

/**
 * 구슬 전체를 인스턴스 메시 하나로 그린다. 물리 좌표를 그대로 쓰므로 y 를 뒤집는 부모 아래에 붙여야 한다.
 * pattern 은 구슬 색에 곱해지는 무늬다. 단색 구는 굴러도 도는 게 안 보여서 필요하다.
 */
export class MarbleMeshes {
  mesh: InstancedMesh;
  private _geometry: SphereGeometry;
  private _material: MeshStandardMaterial;
  private _matrix = new Matrix4();
  private _position = new Vector3();
  private _rotation = new Quaternion();
  private _color = new Color();

  constructor(radius: number, pattern: Texture | null = null) {
    this._geometry = new SphereGeometry(radius, 32, 20);
    this._material = new MeshStandardMaterial({ map: pattern, roughness: 0.35, metalness: 0.1 });
    this.mesh = this.createMesh(INITIAL_CAPACITY);
  }

  get capacity() {
    return this.mesh.instanceMatrix.count;
  }

  /** 구슬 수가 용량을 넘어 메시를 새로 만들었으면 true. 호출한 쪽이 장면에 다시 붙여야 한다 */
  sync(marbles: Marble[], theme: ColorTheme): boolean {
    let replaced = false;
    if (marbles.length > this.capacity) {
      let capacity = this.capacity;
      while (capacity < marbles.length) capacity *= 2;
      this.mesh.dispose();
      this.mesh = this.createMesh(capacity);
      replaced = true;
    }

    marbles.forEach((marble, i) => {
      const { x, y, angle } = marble.position;
      this._position.set(x, y, 0);
      this._rotation.setFromAxisAngle(Z_AXIS, angle);
      this._matrix.compose(this._position, this._rotation, UNIT_SCALE);
      this.mesh.setMatrixAt(i, this._matrix);

      const lightness = theme.marbleLightness + 25 * Math.min(1, marble.impact / 500);
      this._color.setHSL(marble.hue / 360, 1, Math.min(1, lightness / 100), SRGBColorSpace);
      this.mesh.setColorAt(i, this._color);
    });
    this.mesh.count = marbles.length;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    return replaced;
  }

  dispose() {
    this.mesh.dispose();
    this._geometry.dispose();
    this._material.dispose();
  }

  private createMesh(capacity: number): InstancedMesh {
    const mesh = new InstancedMesh(this._geometry, this._material, capacity);
    mesh.count = 0;
    // 인스턴스 위치가 매 프레임 바뀌어 경계 구가 맞지 않으므로 절두체 컬링을 끈다
    mesh.frustumCulled = false;
    return mesh;
  }
}
