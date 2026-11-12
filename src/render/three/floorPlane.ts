import { CanvasTexture, Mesh, MeshStandardMaterial, PlaneGeometry, SRGBColorSpace } from 'three';
import type { StageDef } from '../../data/maps';
import { type FloorColors, floorBounds, paintFloor } from '../stageFloor';

const MAX_TEXTURE_SIZE = 4096;
const PIXELS_PER_UNIT = 16;

/**
 * 맵 바닥. 구슬이 다니는 안쪽은 밝게, 바깥은 배경판과 같은 색으로 칠한 평면이다.
 * 그림은 맵마다 한 번만 그린다. 물리 좌표를 그대로 쓰므로 mesh 를 y 를 뒤집는 부모 아래에 붙여야 한다.
 */
export class FloorPlane {
  readonly mesh: Mesh<PlaneGeometry, MeshStandardMaterial>;
  private _stage: StageDef | null = null;

  constructor(
    z: number,
    private colors: FloorColors
  ) {
    this.mesh = new Mesh(new PlaneGeometry(1, 1), new MeshStandardMaterial({ roughness: 0.9, metalness: 0 }));
    this.mesh.position.z = z;
    this.mesh.receiveShadow = true;
    this.mesh.visible = false;
  }

  /** @param stage 바닥을 깔 맵. null 이면 바닥을 숨긴다 */
  sync(stage: StageDef | null) {
    this.mesh.visible = !!stage;
    if (!stage || stage === this._stage) return;
    this._stage = stage;

    const bounds = floorBounds(stage);
    const scale = Math.min(PIXELS_PER_UNIT, MAX_TEXTURE_SIZE / bounds.w, MAX_TEXTURE_SIZE / bounds.h);
    // 부모가 y 를 뒤집으므로 캔버스 첫 줄(물리 y 가 가장 작은 쪽) 이 평면의 -y 쪽에 오게 한다
    const texture = new CanvasTexture(paintFloor(stage, this.colors, scale));
    texture.colorSpace = SRGBColorSpace;
    texture.flipY = false;
    texture.anisotropy = 4;
    const material = this.mesh.material;
    material.map?.dispose();
    material.map = texture;
    material.needsUpdate = true;
    this.mesh.scale.set(bounds.w, bounds.h, 1);
    this.mesh.position.x = bounds.x + bounds.w / 2;
    this.mesh.position.y = bounds.y + bounds.h / 2;
  }
}
