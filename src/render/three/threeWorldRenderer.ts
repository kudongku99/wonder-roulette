import {
  AmbientLight,
  CanvasTexture,
  Color,
  DirectionalLight,
  Group,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';
import type { WorldDebugDraw, WorldFrame, WorldRenderer } from '../worldRenderer';
import { applyView2d, CAMERA_FOV } from './cameraRig';
import { MarbleMeshes } from './marbleMeshes';
import { StageMeshes } from './stageMeshes';

const MARBLE_RADIUS = 0.25;

/** 구슬 색에 곱해지는 무늬. 밝은 바탕에 어두운 띠 두 줄 */
function createMarblePattern(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 32;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#9a9a9a';
  ctx.fillRect(0, 0, 8, canvas.height);
  ctx.fillRect(32, 0, 8, canvas.height);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/**
 * Three.js 로 월드를 그린 뒤 결과를 2D 장면 캔버스에 옮겨 그린다.
 * 물리 좌표(y 가 아래로 증가) 에서 Three.js 좌표(y 가 위) 로의 변환은 _world 그룹의 y 반전과
 * applyView2d 두 곳에서만 한다. 그 아래에 붙는 메시는 물리 좌표를 그대로 쓴다.
 */
export class ThreeWorldRenderer implements WorldRenderer {
  /** 아직 지원하지 않는다. 값은 받아 두지만 그리지 않는다 */
  debugDraw: WorldDebugDraw | null = null;

  private _renderer: WebGLRenderer;
  private _scene = new Scene();
  private _camera = new PerspectiveCamera(CAMERA_FOV);
  private _world = new Group();
  private _stage = new StageMeshes();
  private _marbles: MarbleMeshes;
  private _background = new Color();
  private _backgroundStyle = '';

  constructor() {
    this._renderer = new WebGLRenderer({ antialias: true });
    this._renderer.setPixelRatio(1);

    this._world.scale.y = -1;
    this._scene.add(this._world);
    this._world.add(this._stage.group);

    this._marbles = new MarbleMeshes(MARBLE_RADIUS, createMarblePattern());
    this._world.add(this._marbles.mesh);

    this._scene.add(new AmbientLight(0xffffff, 0.7));
    const sun = new DirectionalLight(0xffffff, 1.8);
    sun.position.set(-0.5, 1, 0.7);
    this._scene.add(sun);
  }

  render(target: CanvasRenderingContext2D, frame: WorldFrame): void {
    const { width, height } = target.canvas;
    const canvas = this._renderer.domElement;
    if (canvas.width !== width || canvas.height !== height) {
      this._renderer.setSize(width, height, false);
    }

    if (frame.theme.background !== this._backgroundStyle) {
      this._backgroundStyle = frame.theme.background;
      this._scene.background = this._background.set(this._backgroundStyle);
    }

    this._stage.sync(frame.entities, frame.theme);
    const previous = this._marbles.mesh;
    if (this._marbles.sync(frame.marbles, frame.theme)) {
      this._world.remove(previous);
      this._world.add(this._marbles.mesh);
    }

    applyView2d(this._camera, frame.camera, width, height);
    this._renderer.render(this._scene, this._camera);
    target.drawImage(canvas, 0, 0, width, height);
  }
}
