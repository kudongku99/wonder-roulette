import { Color, DoubleSide, Group, Mesh, MeshBasicMaterial, RingGeometry } from 'three';
import type { SkillEffect } from '../../skillEffect';
import type { ColorTheme } from '../../types/ColorTheme';

/**
 * 스킬 이펙트(구슬에서 퍼져 나가는 충격파) 를 구슬 평면 위의 고리로 그린다.
 * 물리 좌표를 그대로 쓰므로 group 을 y 를 뒤집는 부모 아래에 붙여야 한다.
 */
export class EffectMeshes {
  readonly group = new Group();
  private _geometry = new RingGeometry(0.96, 1, 64);
  private _rings: Mesh<RingGeometry, MeshBasicMaterial>[] = [];
  private _color = new Color();

  get visibleCount() {
    return this._rings.filter((ring) => ring.visible).length;
  }

  sync(effects: SkillEffect[], theme: ColorTheme) {
    this._color.set(theme.skillColor);
    effects.forEach((effect, i) => {
      const ring = this.ringAt(i);
      const rate = effect.progress;
      ring.position.set(effect.position.x, effect.position.y, 0);
      ring.scale.setScalar(Math.max(effect.size, 0.001));
      ring.material.color.copy(this._color);
      ring.material.opacity = Math.max(0, 1 - rate * rate);
      ring.visible = true;
    });
    for (let i = effects.length; i < this._rings.length; i++) this._rings[i].visible = false;
  }

  private ringAt(index: number) {
    let ring = this._rings[index];
    if (!ring) {
      const material = new MeshBasicMaterial({ transparent: true, depthWrite: false, side: DoubleSide });
      ring = new Mesh(this._geometry, material);
      this._rings[index] = ring;
      this.group.add(ring);
    }
    return ring;
  }
}
