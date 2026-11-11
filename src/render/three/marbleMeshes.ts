import {
  Color,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Quaternion,
  SphereGeometry,
  SRGBColorSpace,
  Texture,
  Vector3,
} from 'three';
import type { Marble } from '../../marble';
import type { ColorTheme } from '../../types/ColorTheme';

const INITIAL_CAPACITY = 64;
const Z_AXIS = new Vector3(0, 0, 1);
const UNIT_SCALE = new Vector3(1, 1, 1);

type SkinOf = (name: string) => CanvasImageSource | undefined;

/**
 * 앞에서 본 모습 그대로 이미지가 입혀지는 구. 앞쪽 반구에 이미지 전체가 한 번 들어간다.
 * y 를 뒤집는 부모 아래에서 이미지 위쪽이 화면 위로 가도록 v 를 잡는다.
 */
function createSkinGeometry(radius: number): SphereGeometry {
  const geometry = new SphereGeometry(radius, 32, 20);
  const position = geometry.getAttribute('position');
  const uv = geometry.getAttribute('uv');
  for (let i = 0; i < position.count; i++) {
    uv.setXY(i, position.getX(i) / radius / 2 + 0.5, 0.5 - position.getY(i) / radius / 2);
  }
  uv.needsUpdate = true;
  return geometry;
}

/**
 * 구슬 메시. 물리 좌표를 그대로 쓰므로 group 을 y 를 뒤집는 부모 아래에 붙여야 한다.
 * 스킨이 없는 구슬은 인스턴스 메시 하나로, 스킨이 있는 구슬은 구슬마다 메시 하나로 그린다.
 * pattern 은 스킨 없는 구슬 색에 곱해지는 무늬다. 단색 구는 굴러도 도는 게 안 보여서 필요하다.
 */
export class MarbleMeshes {
  readonly group = new Group();
  private _instances: InstancedMesh;
  private _geometry: SphereGeometry;
  private _material: MeshPhysicalMaterial;
  private _skinGeometry: SphereGeometry;
  private _skinMaterials = new Map<CanvasImageSource, MeshStandardMaterial>();
  private _skinMeshes: Mesh[] = [];
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
    this._skinGeometry = createSkinGeometry(radius);
    this._instances = this.createInstances(INITIAL_CAPACITY);
  }

  get capacity() {
    return this._instances.instanceMatrix.count;
  }

  /** 스킨 없이 그려지는 구슬 수 */
  get instanceCount() {
    return this._instances.count;
  }

  /** 스킨으로 그려지는 구슬 수 */
  get skinnedCount() {
    return this._skinMeshes.filter((mesh) => mesh.visible).length;
  }

  getInstanceMatrix(index: number, target: Matrix4) {
    this._instances.getMatrixAt(index, target);
    return target;
  }

  sync(marbles: Marble[], theme: ColorTheme, skinOf: SkinOf = () => undefined) {
    if (marbles.length > this.capacity) {
      let capacity = this.capacity;
      while (capacity < marbles.length) capacity *= 2;
      this.group.remove(this._instances);
      this._instances.dispose();
      this._instances = this.createInstances(capacity);
    }

    let plain = 0;
    let skinned = 0;
    for (const marble of marbles) {
      const { x, y, angle } = marble.position;
      const skin = skinOf(marble.name);
      if (skin) {
        const mesh = this.skinMeshAt(skinned++);
        mesh.material = this.skinMaterialFor(skin);
        mesh.position.set(x, y, 0);
        mesh.rotation.z = angle;
        mesh.visible = true;
        continue;
      }

      this._position.set(x, y, 0);
      this._rotation.setFromAxisAngle(Z_AXIS, angle);
      this._matrix.compose(this._position, this._rotation, UNIT_SCALE);
      this._instances.setMatrixAt(plain, this._matrix);

      const lightness = theme.marbleLightness + 25 * Math.min(1, marble.impact / 500);
      this._color.setHSL(marble.hue / 360, 1, Math.min(1, lightness / 100), SRGBColorSpace);
      this._instances.setColorAt(plain, this._color);
      plain++;
    }

    this._instances.count = plain;
    this._instances.instanceMatrix.needsUpdate = true;
    if (this._instances.instanceColor) this._instances.instanceColor.needsUpdate = true;
    for (let i = skinned; i < this._skinMeshes.length; i++) this._skinMeshes[i].visible = false;
  }

  dispose() {
    this._instances.dispose();
    this._geometry.dispose();
    this._material.dispose();
    this._skinGeometry.dispose();
    for (const material of this._skinMaterials.values()) {
      material.map?.dispose();
      material.dispose();
    }
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

  private skinMeshAt(index: number): Mesh {
    let mesh = this._skinMeshes[index];
    if (!mesh) {
      mesh = new Mesh(this._skinGeometry);
      mesh.castShadow = true;
      this._skinMeshes[index] = mesh;
      this.group.add(mesh);
    }
    return mesh;
  }

  private skinMaterialFor(skin: CanvasImageSource): MeshStandardMaterial {
    let material = this._skinMaterials.get(skin);
    if (!material) {
      const texture = new Texture(skin);
      texture.colorSpace = SRGBColorSpace;
      texture.needsUpdate = true;
      material = new MeshStandardMaterial({ map: texture, roughness: 0.35, metalness: 0.1 });
      this._skinMaterials.set(skin, material);
    }
    return material;
  }
}
