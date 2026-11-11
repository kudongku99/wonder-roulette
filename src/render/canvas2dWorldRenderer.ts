import { initialZoom } from '../data/constants';
import type { Marble } from '../marble';
import options from '../options';
import type { SkillEffect } from '../skillEffect';
import type { ColorTheme } from '../types/ColorTheme';
import type { MapEntityState } from '../types/MapEntity.type';
import { transformGuard } from '../utils/transformGuard';
import { rad } from '../utils/utils';
import type { WorldDebugDraw, WorldFrame, WorldRenderer } from './worldRenderer';

type ViewBounds = { left: number; right: number; top: number; bottom: number };

export class Canvas2dWorldRenderer implements WorldRenderer {
  debugDraw: WorldDebugDraw | null = null;

  render(ctx: CanvasRenderingContext2D, frame: WorldFrame): void {
    const { camera, theme } = frame;
    const { width, height } = ctx.canvas;

    ctx.fillStyle = theme.background;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.scale(initialZoom, initialZoom);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = '0.4pt sans-serif';
    ctx.lineWidth = 3 / (camera.zoom + initialZoom);

    const zoomFactor = initialZoom * 2 * camera.zoom;
    ctx.save();
    ctx.translate(-camera.x * camera.zoom, -camera.y * camera.zoom);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(width / zoomFactor, height / zoomFactor);
    this.debugDraw?.(ctx);
    this.renderEntities(ctx, frame.entities, theme);
    const zoom = camera.zoom * initialZoom;
    frame.effects.forEach((effect) => this.renderSkillEffect(ctx, effect, zoom, theme));
    this.renderMarbles(ctx, frame, zoom);
    ctx.restore();

    ctx.restore();
  }

  private renderEntities(ctx: CanvasRenderingContext2D, entities: MapEntityState[], theme: ColorTheme) {
    ctx.save();
    entities.forEach((entity) => {
      const transform = ctx.getTransform();
      ctx.translate(entity.x, entity.y);
      ctx.rotate(entity.angle);
      ctx.fillStyle = entity.shape.color ?? theme.entity[entity.shape.type].fill;
      ctx.strokeStyle = entity.shape.color ?? theme.entity[entity.shape.type].outline;
      ctx.shadowBlur = theme.entity[entity.shape.type].bloomRadius;
      ctx.shadowColor = entity.shape.bloomColor ?? entity.shape.color ?? theme.entity[entity.shape.type].bloom;
      const shape = entity.shape;
      switch (shape.type) {
        case 'polyline':
          if (shape.points.length > 0) {
            ctx.beginPath();
            ctx.moveTo(shape.points[0][0], shape.points[0][1]);
            for (let i = 1; i < shape.points.length; i++) {
              ctx.lineTo(shape.points[i][0], shape.points[i][1]);
            }
            ctx.stroke();
          }
          break;
        case 'box': {
          const w = shape.width * 2;
          const h = shape.height * 2;
          ctx.rotate(shape.rotation);
          ctx.fillRect(-w / 2, -h / 2, w, h);
          ctx.strokeRect(-w / 2, -h / 2, w, h);
          break;
        }
        case 'circle':
          ctx.beginPath();
          ctx.arc(0, 0, shape.radius, 0, Math.PI * 2, false);
          ctx.stroke();
          break;
      }

      ctx.setTransform(transform);
    });
    ctx.restore();
  }

  private renderSkillEffect(ctx: CanvasRenderingContext2D, effect: SkillEffect, zoom: number, theme: ColorTheme) {
    ctx.save();
    const rate = effect.progress;
    ctx.globalAlpha = 1 - rate * rate;
    ctx.strokeStyle = theme.skillColor;
    ctx.lineWidth = 1 / zoom;
    ctx.beginPath();
    ctx.arc(effect.position.x, effect.position.y, effect.size, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  private renderMarbles(ctx: CanvasRenderingContext2D, frame: WorldFrame, zoom: number) {
    const { camera, marbles, winning, theme } = frame;
    const halfW = ctx.canvas.width / zoom / 2;
    const halfH = ctx.canvas.height / zoom / 2;
    const view: ViewBounds = {
      left: camera.x - halfW,
      right: camera.x + halfW,
      top: camera.y - halfH,
      bottom: camera.y + halfH,
    };
    marbles.forEach((marble, i) => {
      const halfSize = marble.size / 2;
      const isOutsideView =
        marble.x + halfSize < view.left ||
        marble.x - halfSize > view.right ||
        marble.y + halfSize < view.top ||
        marble.y - halfSize > view.bottom;
      if (isOutsideView) return;

      const transform = ctx.getTransform();
      this.renderMarble(ctx, marble, zoom, i >= winning.first && i <= winning.last, frame.skinOf(marble.name), theme);
      ctx.setTransform(transform);
    });
  }

  private renderMarble(
    ctx: CanvasRenderingContext2D,
    marble: Marble,
    zoom: number,
    outline: boolean,
    skin: CanvasImageSource | undefined,
    theme: ColorTheme
  ) {
    const hs = marble.size / 2;

    ctx.fillStyle = `hsl(${marble.hue} 100% ${theme.marbleLightness + 25 * Math.min(1, marble.impact / 500)}%`;

    if (skin) {
      transformGuard(ctx, () => {
        ctx.translate(marble.x, marble.y);
        ctx.rotate(marble.angle);
        ctx.drawImage(skin, -hs, -hs, hs * 2, hs * 2);
      });
    } else {
      ctx.beginPath();
      ctx.arc(marble.x, marble.y, hs, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.shadowColor = '';
    ctx.shadowBlur = 0;
    transformGuard(ctx, () => {
      ctx.font = `12pt sans-serif`;
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 2;
      ctx.fillStyle = marble.color;
      ctx.shadowBlur = 0;
      ctx.translate(marble.x, marble.y + 0.25);
      ctx.scale(1 / zoom, 1 / zoom);
      ctx.strokeText(marble.name, 0, 0);
      ctx.fillText(marble.name, 0, 0);
    });

    if (outline) {
      ctx.beginPath();
      ctx.strokeStyle = theme.marbleWinningBorder;
      ctx.lineWidth = 2 / zoom;
      ctx.arc(marble.x, marble.y, hs, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (options.useSkills) {
      ctx.strokeStyle = theme.coolTimeIndicator;
      ctx.lineWidth = 1 / zoom;
      ctx.beginPath();
      ctx.arc(marble.x, marble.y, hs + 2 / zoom, rad(270), rad(270 + 360 * marble.coolTimeRatio));
      ctx.stroke();
    }
  }
}
