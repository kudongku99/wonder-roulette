import { PerspectiveCamera } from 'three';
import { expect, test } from 'vitest';
import options from '../src/options';
import { applyView2d, CAMERA_FOV } from '../src/render/three/cameraRig';
import { drawMarbleOverlay } from '../src/render/three/marbleOverlay';
import { createRecordingContext } from './helpers/recordingContext';
import { createWorldScene, SCENE_HEIGHT, SCENE_WIDTH } from './helpers/worldScene';

function draw() {
  const { winnerRange, ...scene } = createWorldScene('dark');
  const camera = new PerspectiveCamera(CAMERA_FOV);
  applyView2d(camera, scene.camera, SCENE_WIDTH, SCENE_HEIGHT);
  const { ctx, log } = createRecordingContext(SCENE_WIDTH, SCENE_HEIGHT);
  drawMarbleOverlay(
    ctx,
    { ...scene, winning: { first: winnerRange.start, last: winnerRange.end }, skinOf: () => undefined },
    camera
  );
  return { log, scene };
}

test('화면 안의 구슬에만 이름을 그린다', () => {
  const { log } = draw();
  const names = log.filter((call) => call[0] === 'fillText').map((call) => call[1]);

  expect(names).toEqual(['plain', 'skinned', 'winner']);
});

test('이름은 구슬 바로 아래, 구슬이 화면에 보이는 위치에 그린다', () => {
  const { log, scene } = draw();
  const [, , x, y] = log.find((call) => call[0] === 'fillText' && call[1] === 'plain') as [
    string,
    string,
    number,
    number,
  ];

  // 카메라가 (12.5, 5) 를 보고 구슬은 (11, 4.5) 에 있으므로 화면 가운데에서 왼쪽 위다
  expect(scene.marbles[0].x).toBe(11);
  expect(x).toBeLessThan(SCENE_WIDTH / 2);
  expect(y).toBeLessThan(SCENE_HEIGHT / 2 + 20);
  expect(x).toBeGreaterThan(0);
});

test('당첨 범위의 구슬에만 테두리를 그린다', () => {
  const { log } = draw();
  const borders = log.filter((call) => call[0] === 'set' && call[1] === 'strokeStyle' && call[2] === 'white');

  expect(borders).toHaveLength(1);
});

test('스킬을 끄면 쿨타임 표시를 그리지 않는다', () => {
  const arcs = () => draw().log.filter((call) => call[0] === 'arc').length;
  const withSkills = arcs();
  options.useSkills = false;
  try {
    expect(arcs()).toBe(withSkills - 3);
  } finally {
    options.useSkills = true;
  }
});
