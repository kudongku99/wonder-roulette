import { isRoomCode, ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from '../src/room/protocol';
import { type Env, Limiter, Room } from './room';

export { Limiter, Room };

/** 정적 사이트(GitHub Pages) 와 주소가 달라 다른 출처의 요청을 받아야 한다. 쿠키나 인증은 쓰지 않는다 */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

/** 한 주소에서 이 시간 동안 만들 수 있는 방 수 */
const CREATE_LIMIT = 10;
const CREATE_WINDOW_MS = 10 * 60_000;

function randomCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(ROOM_CODE_LENGTH));
  return Array.from(bytes, (byte) => ROOM_CODE_ALPHABET[byte % ROOM_CODE_ALPHABET.length]).join('');
}

/** ALLOWED_ORIGINS 를 정해 두었으면 그 사이트에서 온 요청만 방을 만들고 들어올 수 있다 */
function originAllowed(request: Request, env: Env): boolean {
  const allowed = (env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  return allowed.length === 0 || allowed.includes(request.headers.get('Origin') ?? '');
}

/**
 * 방 서버의 입구.
 *   POST /rooms                        새 방을 만들고 { code } 를 돌려준다
 *   GET  /rooms/:code/ws               그 방의 웹소켓
 *   GET  /rooms/:code/results/:round   남겨 둔 한 판의 결과
 */
export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

    if (url.pathname === '/rooms' && request.method === 'POST') {
      if (!originAllowed(request, env)) return new Response('forbidden', { status: 403, headers: CORS });
      const address = request.headers.get('CF-Connecting-IP') ?? 'local';
      const limiter = env.LIMITS.get(env.LIMITS.idFromName(address));
      if (!(await limiter.take(CREATE_LIMIT, CREATE_WINDOW_MS))) {
        return new Response('too many rooms', { status: 429, headers: CORS });
      }
      for (let attempt = 0; attempt < 5; attempt++) {
        const code = randomCode();
        const created = await env.ROOMS.get(env.ROOMS.idFromName(code)).create(code);
        if (created) return Response.json({ code }, { headers: CORS });
      }
      return new Response('busy', { status: 503, headers: CORS });
    }

    const [, code, rest] = /^\/rooms\/([^/]+)\/(.+)$/.exec(url.pathname) ?? [];
    if (!code || !isRoomCode(code)) return new Response('not found', { status: 404, headers: CORS });
    const room = env.ROOMS.get(env.ROOMS.idFromName(code));

    if (rest === 'ws' && request.headers.get('Upgrade') === 'websocket') {
      if (!originAllowed(request, env)) return new Response('forbidden', { status: 403, headers: CORS });
      return room.fetch(request);
    }

    const round = /^results\/(\d{1,6})$/.exec(rest)?.[1];
    if (round && request.method === 'GET') {
      const result = await room.getResult(Number(round));
      return result
        ? Response.json(result, { headers: CORS })
        : new Response('not found', { status: 404, headers: CORS });
    }
    return new Response('not found', { status: 404, headers: CORS });
  },
} satisfies ExportedHandler<Env>;
