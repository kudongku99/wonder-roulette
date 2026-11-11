import {
  AmbientLight,
  CanvasTexture,
  Color,
  DirectionalLight,
  Group,
  HalfFloatType,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  SRGBColorSpace,
  Vector2,
  WebGLRenderer,
  WebGLRenderTarget,
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { initialZoom } from '../../data/constants';
import type { ColorTheme } from '../../types/ColorTheme';
import type { WorldDebugDraw, WorldFrame, WorldRenderer } from '../worldRenderer';
import { applyView2d, CAMERA_FOV, finishAngle } from './cameraRig';
import { ConfettiMeshes } from './confettiMeshes';
import { DebugPlane } from './debugPlane';
import { EffectMeshes } from './effectMeshes';
import { MarbleMeshes } from './marbleMeshes';
import { drawMarbleOverlay } from './marbleOverlay';
import { STAGE_DEPTH, StageMeshes } from './stageMeshes';

const MARBLE_RADIUS = 0.25;
/** 배경판 한 변의 길이. 어떤 줌에서도 화면을 다 덮도록 넉넉히 둔다 */
const BACKBOARD_SIZE = 600;
/** 어두운 배경은 그림자가 보이도록 이 색 쪽으로 밝힌다 */
const DARK_BACKBOARD_TINT = new Color('#2b3050');
const SHADOW_MAP_SIZE = 2048;
/** 빛이 오는 방향 (Three.js 좌표). 왼쪽 위 앞에서 비춘다 */
const SUN_DIRECTION = { x: -0.45, y: 0.75, z: 1 };
const SUN_DISTANCE = 40;

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

/** 다크 테마처럼 장애물이 빛나는 테마인지 */
function glows(theme: ColorTheme): boolean {
  const { box, circle, polyline } = theme.entity;
  return box.bloomRadius > 0 || circle.bloomRadius > 0 || polyline.bloomRadius > 0;
}

/**
 * Three.js 로 월드를 그린 뒤 결과를 2D 캔버스에 옮겨 그린다.
 * 물리 좌표(y 가 아래로 증가) 에서 Three.js 좌표(y 가 위) 로의 변환은 _world 그룹의 y 반전과
 * applyView2d 두 곳에서만 한다. 그 아래에 붙는 메시는 물리 좌표를 그대로 쓴다.
 */
export class ThreeWorldRenderer implements WorldRenderer {
  readonly rendersAtDisplayResolution = true;
  readonly drawsGoalBursts = true;
  debugDraw: WorldDebugDraw | null = null;

  private _renderer: WebGLRenderer;
  private _scene = new Scene();
  private _camera = new PerspectiveCamera(CAMERA_FOV);
  private _world = new Group();
  private _stage = new StageMeshes();
  private _marbles: MarbleMeshes;
  private _effects = new EffectMeshes();
  private _confetti = new ConfettiMeshes();
  private _debug = new DebugPlane(-STAGE_DEPTH / 2);
  private _backboard: Mesh<PlaneGeometry, MeshStandardMaterial>;
  private _sun = new DirectionalLight(0xffffff, 2.4);
  private _ambient = new AmbientLight(0xffffff, 0.35);
  private _background = new Color();
  private _theme: ColorTheme | null = null;
  private _glows = false;
  private _composer: EffectComposer | null = null;
  private _bloom: UnrealBloomPass | null = null;

  constructor() {
    this._renderer = new WebGLRenderer({ antialias: true });
    this._renderer.setPixelRatio(1);
    this._renderer.shadowMap.enabled = true;

    const pmrem = new PMREMGenerator(this._renderer);
    this._scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this._world.scale.y = -1;
    this._scene.add(this._world);

    this._backboard = new Mesh(
      new PlaneGeometry(BACKBOARD_SIZE, BACKBOARD_SIZE),
      new MeshStandardMaterial({ roughness: 0.9, metalness: 0 })
    );
    this._backboard.position.z = -STAGE_DEPTH / 2 - 0.02;
    this._backboard.receiveShadow = true;
    this._world.add(this._backboard);

    this._world.add(this._debug.mesh);
    this._world.add(this._stage.group);
    this._marbles = new MarbleMeshes(MARBLE_RADIUS, createMarblePattern());
    this._world.add(this._marbles.group);
    this._world.add(this._effects.group);
    this._world.add(this._confetti.mesh);

    this._sun.castShadow = true;
    this._sun.shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
    this._sun.shadow.bias = -0.0005;
    this._sun.shadow.normalBias = 0.02;
    this._sun.shadow.camera.near = 1;
    this._sun.shadow.camera.far = SUN_DISTANCE * 2;
    this._scene.add(this._sun);
    this._scene.add(this._sun.target);
    this._scene.add(this._ambient);
  }

  render(target: CanvasRenderingContext2D, frame: WorldFrame): void {
    const { width, height } = target.canvas;
    const canvas = this._renderer.domElement;
    if (canvas.width !== width || canvas.height !== height) {
      this._renderer.setSize(width, height, false);
      this._composer?.setSize(width, height);
    }

    this.applyTheme(frame.theme);
    this._stage.sync(frame.entities, frame.theme);
    this._marbles.sync(frame.marbles, frame.theme, frame.skinOf);
    this._effects.sync(frame.effects, frame.theme);
    this._confetti.sync(frame.bursts);
    this._debug.sync(this.debugDraw, frame.stage);

    const { camera, viewSize } = frame;
    applyView2d(this._camera, camera, viewSize.x, viewSize.y, finishAngle(camera.zoom, performance.now() / 1000));
    this.followView(
      camera.x,
      camera.y,
      viewSize.x / (initialZoom * camera.zoom),
      viewSize.y / (initialZoom * camera.zoom)
    );

    if (this._glows) {
      this.composer(width, height).render();
    } else {
      this._renderer.render(this._scene, this._camera);
    }
    target.drawImage(canvas, 0, 0, width, height);
    drawMarbleOverlay(target, frame, this._camera);
  }

  private applyTheme(theme: ColorTheme) {
    if (theme === this._theme) return;
    this._theme = theme;
    this._glows = glows(theme);
    this._background.set(theme.background);
    this._scene.background = this._background;
    const board = this._backboard.material.color.copy(this._background);
    if (this._glows) board.lerp(DARK_BACKBOARD_TINT, 0.22);
    // 빛나는 테마는 장애물의 발광이 주인공이라 주변 빛을 줄인다
    this._scene.environmentIntensity = this._glows ? 0.25 : 0.4;
    this._sun.intensity = this._glows ? 1.3 : 1.7;
    this._ambient.intensity = this._glows ? 0.15 : 0.2;
  }

  /** 배경판과 그림자 범위가 지금 보이는 곳을 따라가게 한다. 인자는 물리 좌표의 화면 중심과 보이는 크기 */
  private followView(x: number, y: number, visibleWidth: number, visibleHeight: number) {
    this._backboard.position.x = x;
    this._backboard.position.y = y;

    this._sun.target.position.set(x, -y, 0);
    this._sun.position.set(
      x + SUN_DIRECTION.x * SUN_DISTANCE,
      -y + SUN_DIRECTION.y * SUN_DISTANCE,
      SUN_DIRECTION.z * SUN_DISTANCE
    );
    // 기울여 볼 때 화면 위아래로 더 보이는 만큼 여유를 둔다
    const half = Math.max(visibleWidth, visibleHeight) * 0.8 + 2;
    const shadowCamera = this._sun.shadow.camera;
    shadowCamera.left = -half;
    shadowCamera.right = half;
    shadowCamera.top = half;
    shadowCamera.bottom = -half;
    shadowCamera.updateProjectionMatrix();
  }

  private composer(width: number, height: number): EffectComposer {
    if (!this._composer) {
      const target = new WebGLRenderTarget(width, height, { type: HalfFloatType, samples: 4 });
      this._composer = new EffectComposer(this._renderer, target);
      this._composer.setPixelRatio(1);
      this._composer.setSize(width, height);
      this._composer.addPass(new RenderPass(this._scene, this._camera));
      this._bloom = new UnrealBloomPass(new Vector2(width, height), 0.35, 0.3, 0.78);
      this._composer.addPass(this._bloom);
      this._composer.addPass(new OutputPass());
    }
    return this._composer;
  }
}
