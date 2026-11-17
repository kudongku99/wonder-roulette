import { DurableObject } from 'cloudflare:workers';
import {
  CHEERS_PER_SECOND,
  CLOSE_KICKED,
  CLOSE_NOT_FOUND,
  CLOSE_REPLACED,
  CLOSE_ROOM_FULL,
  parseClientMessage,
  type ServerMessage,
  type SharedResult,
} from '../src/room/protocol';
import { applyMessage, createRoom, drop, join, leave, type RoomState, rankedNames } from '../src/room/roomState';
import { MAX_SNAPSHOT_LENGTH, SNAPSHOT_PREFIX } from '../src/room/snapshot';

export interface Env {
  ROOMS: DurableObjectNamespace<Room>;
  LIMITS: DurableObjectNamespace<Limiter>;
  /** 방을 만들고 들어올 수 있는 사이트의 출처. 쉼표로 여러 개. 비어 있으면 가리지 않는다 */
  ALLOWED_ORIGINS?: string;
}

/** 연결이 끊긴 사람의 자리와 구슬을 남겨 두는 시간. 새로고침이나 잠깐의 끊김은 이 안에 돌아온다 */
const GRACE_MS = 30_000;
/** 아무도 없는 방을 지우기까지의 시간 */
const ROOM_TTL_MS = 10 * 60_000;
const STORAGE_KEY = 'room';
/** 결과를 남겨 두는 시간. 방이 지워진 뒤에도 결과 링크는 이때까지 열린다 */
const RESULT_TTL_MS = 7 * 24 * 60 * 60_000;
/** 방 하나가 남겨 두는 결과 수. 넘으면 오래된 판부터 지운다 */
const MAX_RESULTS = 20;
/** 남아 있는 결과가 모두 지워질 시각 */
const RESULTS_UNTIL_KEY = 'resultsUntil';
const resultKey = (round: number) => `result:${round}`;

type RoomRecord = {
  state: RoomState;
  /** 브라우저 탭의 비밀 값 → 방 안에서 쓰는 공개 id. 비밀 값은 방 밖으로 내보내지 않는다 */
  secrets: Record<string, string>;
  /** 연결이 끊긴 사람과 끊긴 시각 */
  leftAt: Record<string, number>;
  /** 방이 빈 시각. 사람이 있으면 null */
  emptyAt: number | null;
};

/** 연결마다 붙여 두는 값. hello 를 받기 전에는 누구인지 모른다 */
type Attachment = {
  memberId: string | null;
  /** 최근에 응원을 보낸 시각들. 횟수 제한에 쓴다 */
  cheers?: number[];
};

function send(ws: WebSocket, message: ServerMessage) {
  try {
    ws.send(JSON.stringify(message));
  } catch {}
}

function memberOf(ws: WebSocket): string | null {
  return (ws.deserializeAttachment() as Attachment | null)?.memberId ?? null;
}

/**
 * 방 하나. 방 상태를 들고 있다가 요청을 받으면 고치고, 바뀐 상태 전체를 방 안 모두에게 보낸다.
 * 연결이 없는 동안에는 잠들어도 되도록 상태를 저장소에 두고 깨어날 때 읽는다.
 */
export class Room extends DurableObject<Env> {
  private record: RoomRecord | null = null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.record = (await ctx.storage.get<RoomRecord>(STORAGE_KEY)) ?? null;
    });
  }

  /** @returns 새로 만들었으면 true, 이미 있는 코드면 false */
  async create(code: string): Promise<boolean> {
    if (this.record) return false;
    // 방은 지워졌어도 결과가 남아 있는 코드는 다시 쓰지 않는다. 판 번호가 겹쳐 옛 결과 링크가 바뀐다
    if ((await this.ctx.storage.get(RESULTS_UNTIL_KEY)) !== undefined) return false;
    this.record = { state: createRoom(code), secrets: {}, leftAt: {}, emptyAt: Date.now() };
    await this.commit();
    return true;
  }

  /** 결과 링크로 볼 한 판의 결과. 없거나 지워졌으면 null */
  async getResult(round: number): Promise<SharedResult | null> {
    return (await this.ctx.storage.get<SharedResult>(resultKey(round))) ?? null;
  }

  async fetch(): Promise<Response> {
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ memberId: null } satisfies Attachment);
    // 브라우저는 웹소켓 연결이 거절된 이유를 읽지 못하므로, 일단 받아서 이유를 알리고 닫는다
    if (!this.record) {
      send(server, { type: 'error', error: 'notFound' });
      server.close(CLOSE_NOT_FOUND, 'not found');
    }
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer) {
    const record = this.record;
    if (!record || typeof raw !== 'string') return;
    if (raw[0] === SNAPSHOT_PREFIX) {
      this.relaySnapshot(record, ws, raw);
      return;
    }
    const message = parseClientMessage(raw);
    if (!message) return;

    const memberId = memberOf(ws);
    if (message.type === 'hello') {
      if (memberId === null) await this.hello(record, ws, message.clientId);
      return;
    }
    if (memberId === null) return;
    if (message.type === 'leave') {
      ws.serializeAttachment({ memberId: null } satisfies Attachment);
      this.remove(record, memberId);
      await this.commit();
      return;
    }

    if (message.type === 'cheer') {
      this.cheer(ws, memberId, message.emoji);
      return;
    }

    const before = record.state;
    const result = applyMessage(before, memberId, message);
    if (!result.ok) {
      send(ws, { type: 'error', error: result.error });
      return;
    }
    record.state = result.state;
    if (message.type === 'kick') this.kicked(record, message.memberId);
    if (message.type === 'result') await this.keepResult(before, message.ranks);
    if (result.rejected?.length) send(ws, { type: 'rejected', names: result.rejected });
    await this.commit();
  }

  async webSocketClose(ws: WebSocket, code: number) {
    try {
      ws.close(code === 1005 || code === 1006 ? 1000 : code);
    } catch {}
    await this.disconnected(ws);
  }

  async webSocketError(ws: WebSocket) {
    await this.disconnected(ws);
  }

  /** 기다려 준 시간이 지난 사람을 빼고, 오래 비어 있던 방은 지운다. 남겨 둔 결과는 제 기한까지 둔다 */
  async alarm() {
    const record = this.record;
    const now = Date.now();
    if (record) {
      for (const [memberId, at] of Object.entries(record.leftAt)) {
        if (now - at < GRACE_MS) continue;
        this.remove(record, memberId);
      }
      const expired =
        record.state.members.length === 0 && record.emptyAt !== null && now - record.emptyAt >= ROOM_TTL_MS;
      if (!expired) {
        await this.commit();
        return;
      }
      this.record = null;
      await this.ctx.storage.delete(STORAGE_KEY);
    }
    const resultsUntil = await this.ctx.storage.get<number>(RESULTS_UNTIL_KEY);
    if (resultsUntil === undefined || now >= resultsUntil) await this.ctx.storage.deleteAll();
    else await this.ctx.storage.setAlarm(resultsUntil);
  }

  /** 응원을 방 안 모두에게(보낸 사람 포함) 넘긴다. 너무 잦으면 버린다 */
  private cheer(from: WebSocket, memberId: string, emoji: number) {
    const now = Date.now();
    const attachment = from.deserializeAttachment() as Attachment;
    const recent = (attachment.cheers ?? []).filter((at) => now - at < 1000);
    if (recent.length >= CHEERS_PER_SECOND) return;
    from.serializeAttachment({ memberId, cheers: [...recent, now] } satisfies Attachment);
    for (const ws of this.ctx.getWebSockets()) {
      if (memberOf(ws) !== null) send(ws, { type: 'cheer', memberId, emoji });
    }
  }

  /** 방장이 내보낸 사람의 연결을 끊는다. 자리는 이미 방 상태에서 빠졌다 */
  private kicked(record: RoomRecord, memberId: string) {
    delete record.leftAt[memberId];
    for (const [secret, id] of Object.entries(record.secrets)) if (id === memberId) delete record.secrets[secret];
    for (const ws of this.ctx.getWebSockets()) {
      if (memberOf(ws) !== memberId) continue;
      ws.serializeAttachment({ memberId: null } satisfies Attachment);
      ws.close(CLOSE_KICKED, 'kicked');
    }
  }

  /** 끝난 판의 순위를 결과 링크용으로 남긴다. state 는 그 판이 돌던 때의 방 상태다 */
  private async keepResult(state: RoomState, ranks: number[]) {
    const names = rankedNames(state, ranks);
    if (!names) return;
    const now = Date.now();
    const result: SharedResult = { code: state.code, round: state.round, names, mapIndex: state.mapIndex, at: now };
    await this.ctx.storage.put(resultKey(state.round), result);
    await this.ctx.storage.put(RESULTS_UNTIL_KEY, now + RESULT_TTL_MS);
    await this.ctx.storage.delete(resultKey(state.round - MAX_RESULTS));
  }

  /**
   * 경기 중인 방장이 보낸 스냅샷을 나머지에게 그대로 넘긴다. 초당 수십 번 오므로 내용을 읽거나 저장하지 않는다.
   * 받는 쪽이 모양을 확인한다
   */
  private relaySnapshot(record: RoomRecord, from: WebSocket, raw: string) {
    if (record.state.phase !== 'playing' || raw.length > MAX_SNAPSHOT_LENGTH) return;
    if (memberOf(from) !== record.state.hostId) return;
    for (const ws of this.ctx.getWebSockets()) {
      if (ws === from || memberOf(ws) === null) continue;
      try {
        ws.send(raw);
      } catch {}
    }
  }

  private async hello(record: RoomRecord, ws: WebSocket, clientId: string) {
    const memberId = record.secrets[clientId] ?? crypto.randomUUID().slice(0, 8);
    const result = join(record.state, memberId);
    if (!result.ok) {
      send(ws, { type: 'error', error: result.error });
      ws.close(CLOSE_ROOM_FULL, 'room full');
      return;
    }
    for (const other of this.ctx.getWebSockets()) {
      if (other !== ws && memberOf(other) === memberId) other.close(CLOSE_REPLACED, 'replaced');
    }
    record.secrets[clientId] = memberId;
    delete record.leftAt[memberId];
    record.state = result.state;
    ws.serializeAttachment({ memberId } satisfies Attachment);
    send(ws, { type: 'welcome', memberId, state: record.state });
    await this.commit(ws);
  }

  /** 자리와 구슬을 없앤다. 같은 탭이 다시 들어오면 새 사람이다 */
  private remove(record: RoomRecord, memberId: string) {
    record.state = drop(record.state, memberId);
    delete record.leftAt[memberId];
    for (const [secret, id] of Object.entries(record.secrets)) if (id === memberId) delete record.secrets[secret];
  }

  private async disconnected(ws: WebSocket) {
    const record = this.record;
    const memberId = memberOf(ws);
    if (!record || memberId === null) return;
    // 같은 사람이 새 연결로 들어와 옛 연결이 닫힌 것이면 자리는 그대로다
    if (this.ctx.getWebSockets().some((other) => other !== ws && memberOf(other) === memberId)) return;
    if (!record.state.members.some((member) => member.id === memberId)) return;
    record.state = leave(record.state, memberId);
    record.leftAt[memberId] = Date.now();
    await this.commit(ws);
  }

  /** 상태를 저장하고, 방 안 모두에게 보내고, 다음에 깨어날 시각을 잡는다 */
  private async commit(except?: WebSocket) {
    const record = this.record;
    if (!record) return;
    if (record.state.members.length === 0) record.emptyAt ??= Date.now();
    else record.emptyAt = null;

    await this.ctx.storage.put(STORAGE_KEY, record);
    for (const ws of this.ctx.getWebSockets()) {
      if (ws !== except && memberOf(ws) !== null) send(ws, { type: 'state', state: record.state });
    }

    const waits = Object.values(record.leftAt).map((at) => at + GRACE_MS);
    if (record.emptyAt !== null) waits.push(record.emptyAt + ROOM_TTL_MS);
    if (waits.length) await this.ctx.storage.setAlarm(Math.min(...waits));
    else await this.ctx.storage.deleteAlarm();
  }
}

/**
 * 방 만들기 횟수 제한. 보낸 쪽 주소마다 객체 하나가 최근 요청 시각을 기억한다.
 * 저장하지 않으므로 객체가 잠들면 잊는다. 짧은 시간에 몰아서 만드는 것만 막으면 된다
 */
export class Limiter extends DurableObject<Env> {
  private hits: number[] = [];

  /** @returns 이번 요청을 받아도 되면 true */
  async take(limit: number, windowMs: number): Promise<boolean> {
    const now = Date.now();
    this.hits = this.hits.filter((at) => now - at < windowMs);
    if (this.hits.length >= limit) return false;
    this.hits.push(now);
    return true;
  }
}
