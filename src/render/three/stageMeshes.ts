import {
  BoxGeometry,
  type BufferGeometry,
  Color,
  CylinderGeometry,
  Group,
  type Material,
  Mesh,
  MeshStandardMaterial,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { ColorTheme } from '../../types/ColorTheme';
import type { EntityShape, MapEntityState } from '../../types/MapEntity.type';

/** 장애물의 깊이 방향 두께. 구슬 지름(0.5) 보다 조금 크게 둔다 */
export const STAGE_DEPTH = 0.6;
/** polyline 벽의 두께. 물리에서는 두께 없는 선이다 */
const WALL_THICKNESS = 0.1;
const PIN_SEGMENTS = 24;
/** 색에 섞는 자체 발광 비율. 조명과 상관없이 색이 살아 있게 한다 */
const EMISSIVE_INTENSITY = 0.15;

type EntityRecord = { shape: EntityShape; mesh: Mesh };

function createGeometry(shape: EntityShape): BufferGeometry {
  switch (shape.type) {
    case 'box': {
      const geometry = new BoxGeometry(shape.width * 2, shape.height * 2, STAGE_DEPTH);
      geometry.rotateZ(shape.rotation);
      return geometry;
    }
    case 'circle': {
      const geometry = new CylinderGeometry(shape.radius, shape.radius, STAGE_DEPTH, PIN_SEGMENTS);
      geometry.rotateX(Math.PI / 2);
      return geometry;
    }
    case 'polyline': {
      const segments: BufferGeometry[] = [];
      for (let i = 0; i < shape.points.length - 1; i++) {
        const [x1, y1] = shape.points[i];
        const [x2, y2] = shape.points[i + 1];
        const length = Math.hypot(x2 - x1, y2 - y1);
        if (length === 0) continue;
        // 꺾이는 곳에 틈이 생기지 않게 양끝을 두께의 절반씩 늘린다
        const segment = new BoxGeometry(length + WALL_THICKNESS, WALL_THICKNESS, STAGE_DEPTH);
        segment.rotateZ(Math.atan2(y2 - y1, x2 - x1));
        segment.translate((x1 + x2) / 2, (y1 + y2) / 2, 0);
        segments.push(segment);
      }
      if (segments.length === 0) return new BoxGeometry(0, 0, 0);
      const merged = mergeGeometries(segments);
      for (const segment of segments) segment.dispose();
      return merged;
    }
  }
}

/** 2D 렌더러와 같은 규칙: box 는 채움색, circle 과 polyline 은 외곽선색. 맵이 색을 지정했으면 그 색 */
function colorOf(shape: EntityShape, theme: ColorTheme): string {
  if (shape.color) return shape.color;
  const colors = theme.entity[shape.type];
  return shape.type === 'box' ? colors.fill : colors.outline;
}

/**
 * 맵의 장애물 메시. 물리 좌표를 그대로 쓰므로 y 를 뒤집는 부모 아래에 붙여야 한다.
 * 매 프레임 sync 로 물리 상태(위치, 회전, 부서져 사라진 것) 를 맞춘다.
 */
export class StageMeshes {
  readonly group = new Group();
  private _records: EntityRecord[] = [];
  private _materials = new Map<string, Material>();
  private _theme: ColorTheme | null = null;

  get count() {
    return this._records.length;
  }

  sync(entities: MapEntityState[], theme: ColorTheme) {
    if (theme !== this._theme) {
      this.clear();
      this._theme = theme;
    }

    // 물리 쪽 목록은 순서를 지킨 채 중간이 빠지기만 하므로, 앞에서부터 맞춰 가며 사라진 것을 지운다.
    // 맵이 바뀌면 도형 객체가 전부 달라 모두 새로 만들어진다
    const next: EntityRecord[] = [];
    let cursor = 0;
    for (const entity of entities) {
      while (cursor < this._records.length && this._records[cursor].shape !== entity.shape) {
        this.remove(this._records[cursor++]);
      }
      const record = cursor < this._records.length ? this._records[cursor++] : this.create(entity.shape, theme);
      record.mesh.position.set(entity.x, entity.y, 0);
      record.mesh.rotation.z = entity.angle;
      next.push(record);
    }
    while (cursor < this._records.length) this.remove(this._records[cursor++]);
    this._records = next;
  }

  clear() {
    for (const record of this._records) this.remove(record);
    this._records = [];
    for (const material of this._materials.values()) material.dispose();
    this._materials.clear();
  }

  private create(shape: EntityShape, theme: ColorTheme): EntityRecord {
    const mesh = new Mesh(createGeometry(shape), this.materialFor(colorOf(shape, theme)));
    this.group.add(mesh);
    return { shape, mesh };
  }

  private remove(record: EntityRecord) {
    this.group.remove(record.mesh);
    record.mesh.geometry.dispose();
  }

  private materialFor(color: string): Material {
    let material = this._materials.get(color);
    if (!material) {
      const base = new Color(color);
      material = new MeshStandardMaterial({
        color: base,
        emissive: base,
        emissiveIntensity: EMISSIVE_INTENSITY,
        roughness: 0.6,
        metalness: 0.1,
      });
      this._materials.set(color, material);
    }
    return material;
  }
}
