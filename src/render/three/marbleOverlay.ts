import { type PerspectiveCamera, Vector3 } from 'three';
import options from '../../options';
import { rad } from '../../utils/utils';
import type { WorldFrame } from '../worldRenderer';

const center = new Vector3();
const edge = new Vector3();
/** 화면 밖으로 이만큼(화면 절반 대비 비율) 벗어난 구슬까지는 그린다. 이름이 화면 안으로 걸칠 수 있다 */
const OFFSCREEN_MARGIN = 0.2;

/**
 * 구슬마다 화면 크기가 일정해야 하는 표시(이름, 당첨 테두리, 스킬 쿨타임) 를 3D 화면 위에 2D 로 그린다.
 * camera 는 이번 프레임의 위치가 반영된 상태여야 한다.
 */
export function drawMarbleOverlay(ctx: CanvasRenderingContext2D, frame: WorldFrame, camera: PerspectiveCamera) {
  const { width, height } = ctx.canvas;
  const { marbles, winning, theme } = frame;

  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = '12pt sans-serif';

  marbles.forEach((marble, i) => {
    const radius = marble.size / 2;
    center.set(marble.x, -marble.y, 0).project(camera);
    if (center.z > 1 || Math.abs(center.x) > 1 + OFFSCREEN_MARGIN || Math.abs(center.y) > 1 + OFFSCREEN_MARGIN) {
      return;
    }
    edge.set(marble.x + radius, -marble.y, 0).project(camera);

    const x = ((center.x + 1) / 2) * width;
    const y = ((1 - center.y) / 2) * height;
    const r = ((edge.x - center.x) / 2) * width;

    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.fillStyle = marble.color;
    ctx.strokeText(marble.name, x, y + r);
    ctx.fillText(marble.name, x, y + r);

    if (i >= winning.first && i <= winning.last) {
      ctx.beginPath();
      ctx.strokeStyle = theme.marbleWinningBorder;
      ctx.lineWidth = 2;
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (options.useSkills) {
      ctx.strokeStyle = theme.coolTimeIndicator;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, r + 2, rad(270), rad(270 + 360 * marble.coolTimeRatio));
      ctx.stroke();
    }
  });

  ctx.restore();
}
