import { CanvasTexture, DoubleSide, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace } from 'three';
import type { StageDef } from '../../data/maps';
import { ProgressMap } from '../../progressMap';
import type { WorldDebugDraw } from '../worldFrame';

const MAX_TEXTURE_SIZE = 4096;
const PIXELS_PER_UNIT = 16;

/**
 * 디버그 그림(진행도 지도, 연출 구역) 을 장애물 뒤쪽 평면에 텍스처로 깐다.
 * 그림은 맵마다 한 번만 그린다. 물리 좌표를 그대로 쓰므로 mesh 를 y 를 뒤집는 부모 아래에 붙여야 한다.
 */
export class DebugPlane {
  readonly mesh: Mesh<PlaneGeometry, MeshBasicMaterial>;
  private _drawn: { draw: WorldDebugDraw; stage: StageDef } | null = null;

  constructor(z: number) {
    const material = new MeshBasicMaterial({ transparent: true, depthWrite: false, side: DoubleSide });
    this.mesh = new Mesh(new PlaneGeometry(1, 1), material);
    this.mesh.position.z = z;
    this.mesh.visible = false;
  }

  sync(draw: WorldDebugDraw | null, stage: StageDef) {
    if (!draw) {
      this.mesh.visible = false;
      return;
    }
    this.mesh.visible = true;
    if (this._drawn?.draw === draw && this._drawn.stage === stage) return;
    this._drawn = { draw, stage };

    const bounds = ProgressMap.for(stage).bounds;
    const scale = Math.min(PIXELS_PER_UNIT, MAX_TEXTURE_SIZE / bounds.w, MAX_TEXTURE_SIZE / bounds.h);
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(bounds.w * scale);
    canvas.height = Math.ceil(bounds.h * scale);
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    ctx.scale(scale, scale);
    ctx.translate(-bounds.x, -bounds.y);
    draw(ctx);

    // 부모가 y 를 뒤집으므로 캔버스 첫 줄(물리 y 가 가장 작은 쪽) 이 평면의 -y 쪽에 오게 한다
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.flipY = false;
    this.mesh.material.map?.dispose();
    this.mesh.material.map = texture;
    this.mesh.material.needsUpdate = true;
    this.mesh.scale.set(bounds.w, bounds.h, 1);
    this.mesh.position.x = bounds.x + bounds.w / 2;
    this.mesh.position.y = bounds.y + bounds.h / 2;
  }
}
