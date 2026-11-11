import { Camera } from '../../src/camera';
import type { StageDef } from '../../src/data/maps';
import type { IPhysics } from '../../src/IPhysics';
import { Marble } from '../../src/marble';
import type { MapEntityState } from '../../src/types/MapEntity.type';

export const SCENE_WIDTH = 800;
export const SCENE_HEIGHT = 450;

const positions: Record<number, { x: number; y: number; angle: number }> = {
  0: { x: 11, y: 4.5, angle: 0 },
  1: { x: 12.5, y: 5.25, angle: 0.7 },
  2: { x: 13.25, y: 6, angle: 1.9 },
  3: { x: 12, y: 300, angle: 0 },
};

const physics = {
  createMarble() {},
  getMarblePosition: (id: number) => positions[id],
  shakeMarble() {},
} as unknown as IPhysics;

const entities: MapEntityState[] = [
  {
    x: 0,
    y: 0,
    angle: 0,
    life: -1,
    shape: {
      type: 'polyline',
      rotation: 0,
      points: [
        [9, 0],
        [9, 8],
        [16, 10],
      ],
    },
  },
  { x: 12, y: 7, angle: 0.4, life: -1, shape: { type: 'box', width: 1.5, height: 0.1, rotation: 0.3 } },
  { x: 14, y: 3, angle: 0, life: 1, shape: { type: 'box', width: 0.5, height: 0.5, rotation: 0, color: '#f0f' } },
  { x: 10.5, y: 6, angle: 0, life: -1, shape: { type: 'circle', radius: 0.4 } },
  { x: 15, y: 6, angle: 0, life: -1, shape: { type: 'circle', radius: 0.6, color: 'red', bloomColor: 'orange' } },
];

export function createWorldScene() {
  const names = ['plain', 'second', 'winner', 'offscreen'];
  const marbles = names.map((name, order) => new Marble(physics, order, names.length, name));

  const camera = new Camera();
  camera.initializePosition({ x: 12.5, y: 5 }, 1.3);

  const stage: StageDef = { title: 'test', goalY: 100, zoomY: 90 };

  return {
    camera,
    stage,
    entities,
    marbles,
    bursts: [],
    viewSize: { x: SCENE_WIDTH, y: SCENE_HEIGHT },
    /** marbles[2] 만 강조한다 */
    winningIndex: 2,
  };
}
