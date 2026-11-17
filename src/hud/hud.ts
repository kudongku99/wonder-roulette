import { t } from '../i18n';
import { CHEERS } from '../room/protocol';
import type { VectorLike } from '../types/VectorLike';
import { el } from '../utils/dom';
import { Arrivals } from './arrivals';
import { ChatBubbles } from './chatBubbles';
import { Cheers } from './cheers';
import type { HudFrame } from './hudFrame';
import { MarbleLabels } from './marbleLabels';
import { Minimap } from './minimap';
import { type HudMode, RankBoard } from './rankBoard';
import { SpeedButton } from './speedButton';

const TOAST_LIFETIME = 1400;

/** HUD 가 바깥에 시키는 일 */
export type HudActions = {
  setFastForward(on: boolean): void;
  /** 카메라를 그 위치로 옮긴다. null 이면 다시 구슬을 따라간다 */
  lookAt(pos: VectorLike | null): void;
  /** 결과 화면의 다시 하기 */
  replay(): void;
  /** 결과 화면의 로비로 */
  toLobby(): void;
  /** 초대방에서 응원을 보낸다. 인자는 CHEERS 안의 순번이다 */
  cheer(emoji: number): void;
  /** 초대방에서 채팅을 보낸다 */
  chat(text: string): void;
};

/**
 * 게임 화면 위에 겹치는 HTML HUD. 프레임마다 update 로 게임 상태를 받아 그린다.
 * 루트는 클릭을 통과시키고, 누를 수 있는 부분만 따로 받는다.
 */
export class Hud {
  readonly node = el('div', 'hud');
  private _labels = new MarbleLabels();
  private _minimap: Minimap;
  private _rank: RankBoard;
  private _arrivals = new Arrivals();
  private _speed: SpeedButton;
  private _cheers: Cheers;
  private _chat: ChatBubbles;
  private _countdown = el('div', 'hud-countdown');
  private _stalled = el('div', 'hud-stalled', t('room.stalled'));
  /** 지금 보여 주는 카운트다운 숫자. 없으면 0 */
  private _count = 0;
  private _width = 0;
  private _height = 0;
  private _result = false;

  constructor(parent: HTMLElement, actions: HudActions) {
    this._minimap = new Minimap(actions.lookAt);
    this._rank = new RankBoard({
      onCopy: () => this.toast(t('hud.copied')),
      onReplay: actions.replay,
      onLobby: actions.toLobby,
      onLinkCopied: () => this.toast(t('hud.linkCopied')),
    });
    this._cheers = new Cheers(actions.cheer);
    this._cheers.node.hidden = true;
    this._chat = new ChatBubbles(actions.chat);
    this._chat.node.hidden = true;
    this._speed = new SpeedButton(t('hud.fastForward'), actions.setFastForward);
    this._countdown.hidden = true;
    this._stalled.hidden = true;
    this._stalled.setAttribute('role', 'status');
    this.node.append(
      this._labels.node,
      this._minimap.node,
      this._arrivals.node,
      this._speed.node,
      this._rank.node,
      this._countdown,
      this._stalled,
      this._cheers.node,
      this._chat.node
    );
    parent.append(this.node);

    new ResizeObserver(([entry]) => {
      this._width = entry.contentRect.width;
      this._height = entry.contentRect.height;
    }).observe(this.node);
  }

  /** 게임 화면이 아닐 때는 숨긴다. 숨긴 동안에는 갱신하지 않는다 */
  setVisible(visible: boolean) {
    this.node.hidden = !visible;
  }

  /** 초대방에서는 한 사람만 배속이면 같은 화면이 깨지므로 빨리 감기를 끄고 숨긴다. 결과 화면의 버튼도 역할에 맞춘다 */
  setMode(mode: HudMode) {
    if (mode !== 'solo') this._speed.reset();
    this._speed.node.hidden = mode !== 'solo';
    this._rank.setMode(mode);
    this._cheers.node.hidden = mode === 'solo';
    this._chat.node.hidden = mode === 'solo';
    if (mode === 'solo') this._rank.setResultLink(null);
  }

  /** 초대방에서 이 판의 결과 링크가 생겼거나 없어졌다 */
  setResultLink(url: string | null) {
    this._rank.setResultLink(url);
  }

  /** 방 안의 누군가가 보낸 응원을 띄운다 */
  showCheer(emoji: number, name: string) {
    if (!this.node.hidden && CHEERS[emoji]) this._cheers.show(CHEERS[emoji], name);
  }

  /** 방 안의 누군가가 보낸 채팅을 말풍선으로 띄운다 */
  showChat(name: string, text: string) {
    if (!this.node.hidden) this._chat.show(name, text);
  }

  /** 닉네임을 넣은 사람만 채팅 입력창을 쓴다 */
  setChatEnabled(enabled: boolean) {
    this._chat.setEnabled(enabled);
  }

  update(frame: HudFrame) {
    if (this.node.hidden || this._width === 0) return;
    const count = frame.countdown === null ? 0 : Math.ceil(frame.countdown / 1000);
    if (count !== this._count) {
      this._count = count;
      this._countdown.hidden = count === 0;
      this._countdown.textContent = String(count);
      // 숫자가 바뀔 때마다 커졌다 줄어드는 효과를 다시 건다
      this._countdown.classList.remove('is-tick');
      void this._countdown.offsetWidth;
      this._countdown.classList.add('is-tick');
    }
    if (this._stalled.hidden === frame.stalled) this._stalled.hidden = !frame.stalled;
    const result = !!frame.winner;
    if (result !== this._result) {
      this._result = result;
      this.node.classList.toggle('is-result', result);
    }
    this._labels.update(frame, this._width, this._height);
    this._minimap.update(frame, this._height);
    this._rank.update(frame);
    this._arrivals.update(frame);
  }

  private toast(message: string) {
    const node = el('div', 'hud-toast', message);
    this.node.append(node);
    window.setTimeout(() => node.remove(), TOAST_LIFETIME);
  }
}
