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
import { type CameraView, DEFAULT_CAMERA_VIEW } from '../../cameraView';
import { canvasHeight, canvasWidth, theme } from '../../data/constants';
import type { Marble } from '../../marble';
import type { VectorLike } from '../../types/VectorLike';
import type { WorldDebugDraw, WorldFrame } from '../worldFrame';
import { applyView2d, CAMERA_FOV, type CameraAngle, finishAngle, groundQuad, viewZoom } from './cameraRig';
import { ConfettiMeshes } from './confettiMeshes';
import { DebugPlane } from './debugPlane';
import { FloorPlane } from './floorPlane';
import { MarbleMeshes } from './marbleMeshes';
import { projectMarble, type ScreenMarble } from './marbleProjection';
import { STAGE_DEPTH, StageMeshes } from './stageMeshes';

const MARBLE_RADIUS = 0.25;
/** 캔버스 픽셀 너비의 상한. 화면이 이보다 넓으면 늘려서 보여준다 */
const MAX_PIXEL_WIDTH = 1920;
/** 보이는 월드 범위를 정하는 화면 크기의 최소 너비 */
const MIN_VIEW_WIDTH = 640;
/** 배경판 한 변의 길이. 어떤 줌에서도 화면을 다 덮도록 넉넉히 둔다 */
const BACKBOARD_SIZE = 600;
/** 맵 바깥(배경판) 은 어둡게, 구슬이 다니는 안쪽 바닥은 그림자가 보이도록 밝게 칠한다 */
const FLOOR_COLORS = { inside: '#252b4d', outside: '#07080f', grid: '#2e3560' };
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

function toRadians(view: CameraView) {
  return { tilt: (view.tilt * Math.PI) / 180, yaw: (view.yaw * Math.PI) / 180, zoom: view.zoom };
}

/**
 * Three.js 로 월드(배경, 장애물, 구슬, 축하 효과) 를 그린다. 화면에 붙는 캔버스는 이 WebGL 캔버스 하나다.
 * 물리 좌표(y 가 아래로 증가) 에서 Three.js 좌표(y 가 위) 로의 변환은 _world 그룹의 y 반전과
 * applyView2d 두 곳에서만 한다. 그 아래에 붙는 메시는 물리 좌표를 그대로 쓴다.
 */
export class ThreeWorldRenderer {
  /** 장애물 아래에 월드 좌표로 덧그리는 그림 (테스트 플레이의 진행도 지도) */
  debugDraw: WorldDebugDraw | null = null;

  private _viewSize: VectorLike = { x: canvasWidth, y: canvasHeight };

  private _renderer: WebGLRenderer;
  private _scene = new Scene();
  private _camera = new PerspectiveCamera(CAMERA_FOV);
  private _world = new Group();
  private _stage = new StageMeshes();
  private _marbles: MarbleMeshes;
  private _confetti = new ConfettiMeshes();
  private _debug = new DebugPlane(-STAGE_DEPTH / 2);
  private _floor = new FloorPlane(-STAGE_DEPTH / 2 - 0.01, FLOOR_COLORS);
  private _backboard: Mesh<PlaneGeometry, MeshStandardMaterial>;
  private _sun = new DirectionalLight(0xffffff, 1.3);
  private _ambient = new AmbientLight(0xffffff, 0.15);
  private _composer: EffectComposer | null = null;
  private _bloom: UnrealBloomPass | null = null;
  /** 사용자가 고른 시점 (각도는 라디안) */
  private _view: CameraAngle & { zoom: number } = toRadians(DEFAULT_CAMERA_VIEW);
  /** 마지막으로 그린 화면의 네 모서리가 z = 0 평면에 닿는 점 (물리 좌표) */
  private _viewQuad: [number, number][] = [];

  /** WebGL 을 쓸 수 없으면 예외를 던진다 */
  constructor() {
    this._renderer = new WebGLRenderer({ antialias: true });
    this._renderer.setPixelRatio(1);
    this._renderer.shadowMap.enabled = true;

    const pmrem = new PMREMGenerator(this._renderer);
    this._scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    // 장애물의 발광이 주인공이라 주변 빛을 줄인다
    this._scene.environmentIntensity = 0.25;
    const background = new Color(theme.background);
    this._scene.background = background;

    this._world.scale.y = -1;
    this._scene.add(this._world);

    this._backboard = new Mesh(
      new PlaneGeometry(BACKBOARD_SIZE, BACKBOARD_SIZE),
      new MeshStandardMaterial({ roughness: 0.9, metalness: 0 })
    );
    this._backboard.material.color.set(FLOOR_COLORS.outside);
    this._backboard.position.z = -STAGE_DEPTH / 2 - 0.02;
    this._backboard.receiveShadow = true;
    this._world.add(this._backboard);

    this._world.add(this._floor.mesh);
    this._world.add(this._debug.mesh);
    this._world.add(this._stage.group);
    this._marbles = new MarbleMeshes(MARBLE_RADIUS, createMarblePattern());
    this._world.add(this._marbles.group);
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

  get canvas(): HTMLCanvasElement {
    return this._renderer.domElement;
  }

  /**
   * 보이는 월드 범위의 기준이 되는 화면 크기. 줌 1 일 때 이 크기 / initialZoom 만큼의 월드가 보인다.
   * 캔버스 픽셀 크기와는 별개라 해상도가 달라져도 보이는 범위는 같다
   */
  get viewSize(): VectorLike {
    return this._viewSize;
  }

  /** 캔버스를 parent 에 붙이고, 화면에 보이는 크기가 바뀔 때마다 해상도를 맞춘다 */
  attach(parent: HTMLElement) {
    const canvas = this.canvas;
    canvas.classList.add('world-canvas');
    parent.appendChild(canvas);
    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      if (width <= 0 || height <= 0) return;
      const viewWidth = Math.max(width / 2, MIN_VIEW_WIDTH);
      this._viewSize = { x: viewWidth, y: (viewWidth / width) * height };
      const pixelWidth = Math.min(width, MAX_PIXEL_WIDTH);
      const pixelHeight = (pixelWidth / width) * height;
      this._renderer.setSize(pixelWidth, pixelHeight, false);
      this._composer?.setSize(pixelWidth, pixelHeight);
    };
    new ResizeObserver(resize).observe(canvas);
    resize();
  }

  /** 사용자가 고른 시점(각도, 배율). 다음 프레임부터 반영된다 */
  setCameraView(view: CameraView) {
    this._view = toRadians(view);
  }

  /** 마지막으로 그린 화면의 네 모서리가 구슬 평면에 닿는 점. 물리 좌표로 왼쪽 위부터 시계 방향이다 */
  get viewQuad(): [number, number][] {
    return this._viewQuad;
  }

  render(frame: WorldFrame): void {
    this._floor.sync(frame.floor === false ? null : frame.stage);
    this._stage.sync(frame.entities);
    this._marbles.sync(frame.marbles);
    this._confetti.sync(frame.bursts);
    this._debug.sync(this.debugDraw, frame.stage);

    const { camera } = frame;
    const viewSize = this._viewSize;
    const view = this._view;
    const finish = camera.finish ?? 0;
    const angle = finishAngle(finish, performance.now() / 1000, view);
    const zoomed = { x: camera.x, y: camera.y, zoom: viewZoom(camera.zoom, view.zoom, finish) };
    applyView2d(this._camera, zoomed, viewSize.x, viewSize.y, angle);
    this._viewQuad = groundQuad(this._camera);
    this.followView(camera.x, camera.y, this._viewQuad);

    this.composer().render();
  }

  /** 마지막으로 그린 화면에서 구슬이 보이는 위치. 화면에서 벗어났으면 null */
  projectMarble(marble: Marble): ScreenMarble | null {
    return projectMarble(this._camera, marble.x, marble.y, marble.size / 2);
  }

  /** 배경판과 그림자 범위가 지금 보이는 곳을 따라가게 한다. 인자는 물리 좌표의 화면 중심과 화면이 평면에 닿는 네 점 */
  private followView(x: number, y: number, quad: [number, number][]) {
    this._backboard.position.x = x;
    this._backboard.position.y = y;

    this._sun.target.position.set(x, -y, 0);
    this._sun.position.set(
      x + SUN_DIRECTION.x * SUN_DISTANCE,
      -y + SUN_DIRECTION.y * SUN_DISTANCE,
      SUN_DIRECTION.z * SUN_DISTANCE
    );
    // 그림자 카메라는 빛 방향으로 비스듬히 보므로 화면이 닿는 범위보다 넉넉히 잡는다
    let reach = 0;
    for (const [qx, qy] of quad) reach = Math.max(reach, Math.abs(qx - x), Math.abs(qy - y));
    const half = reach * 1.15 + 2;
    const shadowCamera = this._sun.shadow.camera;
    shadowCamera.left = -half;
    shadowCamera.right = half;
    shadowCamera.top = half;
    shadowCamera.bottom = -half;
    shadowCamera.updateProjectionMatrix();
  }

  private composer(): EffectComposer {
    if (!this._composer) {
      const { width, height } = this.canvas;
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
