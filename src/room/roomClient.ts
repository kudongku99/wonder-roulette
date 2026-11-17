import {
  CLOSE_KICKED,
  CLOSE_NOT_FOUND,
  CLOSE_REPLACED,
  CLOSE_ROOM_FULL,
  type ClientMessage,
  type ServerMessage,
  type SharedResult,
} from './protocol';
import type { RoomError, RoomState } from './roomState';
import { encodeSnapshot, parseSnapshot, SNAPSHOT_PREFIX, type Snapshot } from './snapshot';

/** 다시 연결을 시도하지 않는 끝. 방이 없거나, 가득 찼거나, 같은 탭 정보로 다른 연결이 들어왔거나, 방장이 내보냈다 */
export type RoomEnd = 'notFound' | 'roomFull' | 'replaced' | 'kicked';
export type RoomStatus = 'connecting' | 'open' | 'reconnecting';

export type RoomHandlers = {
  onState(state: RoomState, memberId: string): void;
  onStatus(status: RoomStatus): void;
  onRejected(names: string[]): void;
  /** 누군가 보낸 응원. emoji 는 CHEERS 안의 순번이다 */
  onCheer(memberId: string, emoji: number): void;
  /** 누군가 보낸 채팅 */
  onChat(memberId: string, text: string): void;
  /** 방장이 보낸 경기 스냅샷 */
  onSnapshot(snapshot: Snapshot): void;
  onError(error: RoomError): void;
  onEnd(reason: RoomEnd): void;
};

const RETRY_BASE_MS = 500;
const RETRY_MAX_MS = 8000;

/** 방 서버 주소. 빌드할 때 VITE_ROOM_SERVER 로 넣고, 개발 서버에서는 같은 기기의 8787 포트를 쓴다. 없으면 null */
export function roomServerUrl(): string | null {
  const configured: string | undefined = import.meta.env.VITE_ROOM_SERVER;
  if (configured) return configured.replace(/\/+$/, '');
  return import.meta.env.DEV ? `${location.protocol}//${location.hostname}:8787` : null;
}

/** 새 방을 만들고 방 코드를 돌려준다 */
export async function createRoom(serverUrl: string): Promise<string> {
  const response = await fetch(`${serverUrl}/rooms`, { method: 'POST' });
  if (!response.ok) throw new Error(`room server responded ${response.status}`);
  const body: { code: string } = await response.json();
  return body.code;
}

/** 서버에 남아 있는 한 판의 결과를 가져온다. 없거나 지워졌으면 null */
export async function fetchResult(serverUrl: string, code: string, round: number): Promise<SharedResult | null> {
  const response = await fetch(`${serverUrl}/rooms/${code}/results/${round}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`room server responded ${response.status}`);
  return response.json();
}

/**
 * 방 하나와의 연결. 끊기면 간격을 늘려 가며 다시 붙고, 같은 clientId 로 들어가므로 서버는 같은 사람으로 본다.
 */
export class RoomClient {
  private _socket: WebSocket | null = null;
  private _memberId: string | null = null;
  private _retries = 0;
  private _timer = 0;
  private _closed = false;

  constructor(
    private serverUrl: string,
    readonly code: string,
    private clientId: string,
    private handlers: RoomHandlers
  ) {}

  send(message: ClientMessage) {
    if (this._socket?.readyState === WebSocket.OPEN) this._socket.send(JSON.stringify(message));
  }

  /** 방장이 경기 중에 보낸다. 서버가 나머지에게 그대로 넘긴다 */
  sendSnapshot(snapshot: Snapshot) {
    if (this._socket?.readyState === WebSocket.OPEN) this._socket.send(encodeSnapshot(snapshot));
  }

  close() {
    this._closed = true;
    window.clearTimeout(this._timer);
    this._socket?.close();
    this._socket = null;
  }

  /** 연결을 시작한다. 만든 뒤 한 번 부른다 */
  connect() {
    const socket = new WebSocket(`${this.serverUrl.replace(/^http/, 'ws')}/rooms/${this.code}/ws`);
    this._socket = socket;
    this.handlers.onStatus(this._retries === 0 && this._memberId === null ? 'connecting' : 'reconnecting');
    socket.addEventListener('open', () => {
      socket.send(JSON.stringify({ type: 'hello', clientId: this.clientId } satisfies ClientMessage));
    });
    socket.addEventListener('message', (event) => {
      if (this._socket === socket && typeof event.data === 'string') this.receive(event.data);
    });
    socket.addEventListener('close', (event) => {
      if (this._socket !== socket || this._closed) return;
      this._socket = null;
      if (event.code === CLOSE_NOT_FOUND) return this.end('notFound');
      if (event.code === CLOSE_ROOM_FULL) return this.end('roomFull');
      if (event.code === CLOSE_REPLACED) return this.end('replaced');
      if (event.code === CLOSE_KICKED) return this.end('kicked');
      this.handlers.onStatus('reconnecting');
      const delay = Math.min(RETRY_MAX_MS, RETRY_BASE_MS * 2 ** this._retries++);
      this._timer = window.setTimeout(() => this.connect(), delay);
    });
  }

  private receive(raw: string) {
    if (raw[0] === SNAPSHOT_PREFIX) {
      const snapshot = parseSnapshot(raw);
      if (snapshot) this.handlers.onSnapshot(snapshot);
      return;
    }
    let message: ServerMessage;
    try {
      message = JSON.parse(raw);
    } catch {
      return;
    }
    switch (message.type) {
      case 'welcome':
        this._memberId = message.memberId;
        this._retries = 0;
        this.handlers.onStatus('open');
        this.handlers.onState(message.state, message.memberId);
        break;
      case 'state':
        if (this._memberId !== null) this.handlers.onState(message.state, this._memberId);
        break;
      case 'rejected':
        this.handlers.onRejected(message.names);
        break;
      case 'cheer':
        this.handlers.onCheer(message.memberId, message.emoji);
        break;
      case 'chat':
        this.handlers.onChat(message.memberId, message.text);
        break;
      case 'error':
        if (message.error === 'notFound' || message.error === 'roomFull') this.end(message.error);
        else this.handlers.onError(message.error);
        break;
    }
  }

  private end(reason: RoomEnd) {
    if (this._closed) return;
    this.close();
    this.handlers.onEnd(reason);
  }
}
