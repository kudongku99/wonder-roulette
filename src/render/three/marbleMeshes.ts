import {
  Color,
  Group,
  InstancedMesh,
  Matrix4,
  MeshPhysicalMaterial,
  Quaternion,
  SphereGeometry,
  SRGBColorSpace,
  type Texture,
  Vector3,
} from 'three';
import { theme } from '../../data/constants';
import type { Marble } from '../../marble';

const INITIAL_CAPACITY = 64;
const Z_AXIS = new Vector3(0, 0, 1);
const UNIT_SCALE = new Vector3(1, 1, 1);

/**
 * 구슬 메시. 물리 좌표를 그대로 쓰므로 group 을 y 를 뒤집는 부모 아래에 붙여야 한다.
 * 구슬 전체를 인스턴스 메시 하나로 그린다.
 * pattern 은 구슬 색에 곱해지는 무늬다. 단색 구는 굴러도 도는 게 안 보여서 필요하다.
 */
export class MarbleMeshes {
  readonly group = new Group();
  private _instances: InstancedMesh;
  private _geometry: SphereGeometry;
  private _material: MeshPhysicalMaterial;
  private _matrix = new Matrix4();
  private _position = new Vector3();
  private _rotation = new Quaternion();
  private _color = new Color();

  constructor(radius: number, pattern: Texture | null = null) {
    this._geometry = new SphereGeometry(radius, 32, 20);
    this._material = new MeshPhysicalMaterial({
      map: pattern,
      roughness: 0.25,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
    });
    this._instances = this.createInstances(INITIAL_CAPACITY);
  }

  get capacity() {
    return this._instances.instanceMatrix.count;
  }

  get instanceCount() {
    return this._instances.count;
  }

  getInstanceMatrix(index: number, target: Matrix4) {
    this._instances.getMatrixAt(index, target);
    return target;
  }

  sync(marbles: Marble[]) {
    if (marbles.length > this.capacity) {
      let capacity = this.capacity;
      while (capacity < marbles.length) capacity *= 2;
      this.group.remove(this._instances);
      this._instances.dispose();
      this._instances = this.createInstances(capacity);
    }

    marbles.forEach((marble, i) => {
      const { x, y, angle } = marble.position;
      this._position.set(x, y, 0);
      this._rotation.setFromAxisAngle(Z_AXIS, angle);
      this._matrix.compose(this._position, this._rotation, UNIT_SCALE);
      this._instances.setMatrixAt(i, this._matrix);
      this._color.setHSL(marble.hue / 360, 1, theme.marbleLightness / 100, SRGBColorSpace);
      this._instances.setColorAt(i, this._color);
    });

    this._instances.count = marbles.length;
    this._instances.instanceMatrix.needsUpdate = true;
    if (this._instances.instanceColor) this._instances.instanceColor.needsUpdate = true;
  }

  dispose() {
    this._instances.dispose();
    this._geometry.dispose();
    this._material.dispose();
  }

  private createInstances(capacity: number): InstancedMesh {
    const mesh = new InstancedMesh(this._geometry, this._material, capacity);
    mesh.count = 0;
    // 인스턴스 위치가 매 프레임 바뀌어 경계 구가 맞지 않으므로 절두체 컬링을 끈다
    mesh.frustumCulled = false;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.group.add(mesh);
    return mesh;
  }
}
