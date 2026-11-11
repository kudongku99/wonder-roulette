export type CallLog = unknown[][];

function plain(value: unknown): unknown {
  if (typeof value === 'number') return Number(value.toFixed(9));
  if (value === null || typeof value !== 'object') return value;
  if ('label' in value) return (value as { label: string }).label;
  return '[object]';
}

/** 호출과 속성 대입을 순서대로 기록하는 가짜 2D 컨텍스트 */
export function createRecordingContext(width: number, height: number) {
  const log: CallLog = [];
  const state: Record<string, unknown> = {};
  let transforms = 0;
  const ctx = new Proxy(
    {},
    {
      get(_target, prop: string) {
        if (prop === 'canvas') return { width, height };
        if (prop in state) return state[prop];
        return (...args: unknown[]) => {
          log.push([prop, ...args.map(plain)]);
          if (prop === 'getTransform') return { label: `transform#${transforms++}` };
          if (prop === 'measureText') return { width: 10 };
          return undefined;
        };
      },
      set(_target, prop: string, value) {
        state[prop] = value;
        log.push(['set', prop, plain(value)]);
        return true;
      },
    }
  ) as unknown as CanvasRenderingContext2D;
  return { ctx, log };
}
