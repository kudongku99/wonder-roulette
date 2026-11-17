import { t } from '../i18n';
import type { RoomStatus } from '../room/roomClient';
import { MAX_NICKNAME_LENGTH, marbleCount, type RoomState, roomMarbles } from '../room/roomState';
import { el, marbleColor } from '../utils/dom';
import { MAX_MARBLES } from '../utils/utils';

/** "복사됨" 을 보여 주는 시간 (ms) */
const COPIED_MS = 1500;

export type RoomLobbyActions = {
  /** 내 구슬 이름을 정한다. 빈 글이면 구슬을 뺀다 */
  setNickname(nickname: string): void;
  addNames(text: string): void;
  removeName(name: string): void;
  chooseMap(): void;
  /** 방장이 경기를 시작한다 */
  start(): void;
  /** 방장이 방장 자리를 넘긴다 */
  transfer(memberId: string): void;
  /** 방장이 그 사람을 내보낸다 */
  kick(memberId: string): void;
  leave(): void;
};

export type RoomView = {
  state: RoomState;
  /** 이 화면을 보는 사람 */
  memberId: string;
  mapTitle: string;
};

/**
 * 초대방 대기실. 초대 링크, 접속자 목록, 내 닉네임, 고른 맵을 보여 주고 방장에게는 맵 바꾸기와 이름 직접 넣기를 연다.
 * 방 상태는 서버가 갖고 있고, 여기서는 받은 상태를 그리고 요청을 콜백으로 내보내기만 한다.
 */
export class RoomLobby {
  readonly node = el('section', 'screen lobby room');
  private _code = el('span', 'room-code');
  private _link = el('input', 'lobby-input room-link');
  private _copy = el('button', 'ui-button', t('room.copy'));
  private _status = el('p', 'lobby-notice');
  private _notice = el('p', 'lobby-notice');
  private _nickname = el('input', 'lobby-input');
  private _join = el('button', 'ui-button is-primary', t('room.join'));
  private _withdraw = el('button', 'ui-button is-quiet', t('room.withdraw'));
  private _membersLabel = el('h3', 'lobby-label');
  private _members = el('ul', 'room-members');
  private _mapTitle = el('span', 'room-map-title');
  private _changeMap = el('button', 'ui-button', t('room.changeMap'));
  private _hostTools = el('div', 'room-host-tools');
  private _extraInput = el('input', 'lobby-input');
  private _extras = el('ul', 'lobby-chips room-extras');
  private _count = el('span', 'lobby-count');
  private _start = el('button', 'ui-button is-primary', t('room.start'));
  private _waitHost = el('p', 'lobby-hint room-wait', t('room.waitHost'));
  private _open = false;
  private _total = 0;
  /** 서버가 마지막으로 알려 준 내 닉네임. 입력 중인 글을 덮어쓰지 않으려고 바뀔 때만 입력창에 넣는다 */
  private _myNickname: string | null | undefined;
  private _copiedTimer = 0;

  constructor(
    private actions: RoomLobbyActions,
    savedNickname: string
  ) {
    const card = el('div', 'ui-panel lobby-card room-card');
    const title = el('h2', 'screen-title room-title', t('room.heading'));
    title.append(this._code);

    const invite = el('div', 'room-row');
    this._link.readOnly = true;
    this._link.setAttribute('aria-label', t('room.inviteHint'));
    this._link.addEventListener('focus', () => this._link.select());
    this._copy.addEventListener('click', () => this.copyLink());
    invite.append(this._link, this._copy);

    const nicknameLabel = el('label', 'lobby-label', t('room.nickname'));
    nicknameLabel.htmlFor = 'roomNickname';
    this._nickname.id = 'roomNickname';
    this._nickname.type = 'text';
    this._nickname.autocomplete = 'off';
    this._nickname.maxLength = MAX_NICKNAME_LENGTH;
    this._nickname.placeholder = t('room.nicknamePlaceholder');
    this._nickname.value = savedNickname;
    const submitNickname = () => {
      if (this._nickname.value.trim()) actions.setNickname(this._nickname.value);
    };
    this._nickname.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || e.isComposing) return;
      e.preventDefault();
      submitNickname();
    });
    this._join.addEventListener('click', submitNickname);
    this._withdraw.addEventListener('click', () => actions.setNickname(''));
    const nicknameRow = el('div', 'room-row');
    nicknameRow.append(this._nickname, this._join);

    const mapRow = el('div', 'room-row room-map');
    mapRow.append(el('span', 'lobby-label', t('room.map')), this._mapTitle, this._changeMap);
    this._changeMap.addEventListener('click', actions.chooseMap);

    const extraLabel = el('label', 'lobby-label', t('room.extras'));
    extraLabel.htmlFor = 'roomExtras';
    this._extraInput.id = 'roomExtras';
    this._extraInput.type = 'text';
    this._extraInput.autocomplete = 'off';
    this._extraInput.placeholder = t('lobby.placeholder');
    this._extraInput.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || e.isComposing) return;
      e.preventDefault();
      this.addExtras(this._extraInput.value);
      this._extraInput.value = '';
    });
    this._extraInput.addEventListener('paste', (e) => {
      const text = e.clipboardData?.getData('text') ?? '';
      if (!/[\r\n]/.test(text)) return;
      e.preventDefault();
      this.addExtras(text);
    });
    this._hostTools.append(extraLabel, this._extraInput, el('p', 'lobby-hint', t('room.extrasHint')), this._extras);

    const leave = el('button', 'ui-button is-quiet', t('room.leave'));
    leave.addEventListener('click', actions.leave);
    const footer = el('div', 'lobby-footer');
    this._start.addEventListener('click', actions.start);
    footer.append(this._count, this._withdraw, leave, this._start);

    for (const button of [this._copy, this._join, this._withdraw, this._changeMap, leave, this._start]) {
      button.type = 'button';
    }
    for (const notice of [this._status, this._notice]) {
      notice.hidden = true;
      notice.setAttribute('role', 'status');
    }
    this._members.setAttribute('aria-live', 'polite');

    card.append(
      title,
      invite,
      el('p', 'lobby-hint', t('room.inviteHint')),
      this._status,
      nicknameLabel,
      nicknameRow,
      this._notice,
      this._membersLabel,
      this._members,
      mapRow,
      this._hostTools,
      this._waitHost,
      footer
    );
    this.node.append(card);
  }

  /** 새 방에 들어갈 때 부른다. 서버의 첫 상태가 오기 전까지 보일 모습으로 되돌린다 */
  open(code: string, inviteUrl: string) {
    this._code.textContent = code;
    this._link.value = inviteUrl;
    this._myNickname = undefined;
    this._notice.hidden = true;
    this._members.replaceChildren();
    this._extras.replaceChildren();
    this._membersLabel.textContent = t('room.members', { n: 0 });
    this._mapTitle.textContent = '';
    this._count.textContent = t('lobby.count', { n: 0, max: MAX_MARBLES });
    this._changeMap.hidden = true;
    this._hostTools.hidden = true;
    this._withdraw.hidden = true;
    this._start.hidden = true;
    this._waitHost.hidden = true;
    this._total = 0;
    this.setStatus('connecting');
  }

  focus() {
    this._nickname.focus();
  }

  setStatus(status: RoomStatus) {
    this._status.hidden = status === 'open';
    this._status.textContent = status === 'open' ? '' : t(`room.${status}`);
    this._open = status === 'open';
    this._join.disabled = !this._open;
    this._start.disabled = !this._open || this._total === 0;
  }

  /** 닉네임 입력 아래에 한 줄 안내를 띄운다. 빈 글이면 지운다 */
  notify(text: string) {
    this._notice.hidden = text === '';
    this._notice.textContent = text;
  }

  update({ state, memberId, mapTitle }: RoomView) {
    const me = state.members.find((member) => member.id === memberId);
    const isHost = state.hostId === memberId;
    const myNickname = me?.nickname ?? null;
    if (myNickname !== this._myNickname) {
      this._myNickname = myNickname;
      if (myNickname !== null) this._nickname.value = myNickname;
      this.notify('');
    }
    this._join.textContent = t(myNickname === null ? 'room.join' : 'room.rename');
    this._withdraw.hidden = myNickname === null;

    // 구슬 색은 게임에서 순서대로 색상환을 돌므로, 목록 안의 위치로 색을 정한다
    const marbles = roomMarbles(state);
    const total = marbleCount(state);
    const colors = new Map<string, string>();
    let seen = 0;
    for (const entry of marbles) {
      colors.set(entry.name, marbleColor(total ? (360 / total) * seen : 0));
      seen += entry.count;
    }

    this._membersLabel.textContent = t('room.members', {
      n: state.members.filter((member) => member.connected).length,
    });
    this._members.replaceChildren(
      ...state.members.map((member) => {
        const row = el('li', 'room-member');
        row.classList.toggle('is-away', !member.connected);
        row.classList.toggle('is-watching', member.nickname === null);
        if (member.nickname !== null) row.style.setProperty('--chip-color', colors.get(member.nickname) ?? '');
        row.append(el('span', 'room-member-dot'), el('span', 'chip-name', member.nickname ?? t('room.watching')));
        if (member.id === state.hostId) row.append(el('span', 'room-badge is-host', t('room.host')));
        if (member.id === memberId) row.append(el('span', 'room-badge', t('room.me')));
        if (!member.connected) row.append(el('span', 'room-badge is-away', t('room.away')));
        if (isHost && member.id !== memberId) {
          const tools = el('span', 'room-member-tools');
          if (member.connected)
            tools.append(this.memberButton(t('room.transfer'), () => this.actions.transfer(member.id)));
          tools.append(this.memberButton(t('room.kick'), () => this.actions.kick(member.id)));
          row.append(tools);
        }
        return row;
      })
    );

    this._mapTitle.textContent = mapTitle;
    this._changeMap.hidden = !isHost;
    this._hostTools.hidden = !isHost;
    this._start.hidden = !isHost;
    this._waitHost.hidden = isHost;
    this._total = total;
    this._start.disabled = !this._open || total === 0;
    this._extras.replaceChildren(
      ...state.extras.map((entry) => {
        const chip = el('li', 'lobby-chip');
        const button = el('button', 'chip-button');
        button.type = 'button';
        button.title = t('lobby.remove', { name: entry.name });
        button.style.setProperty('--chip-color', colors.get(entry.name) ?? '');
        button.append(el('span', 'chip-name', entry.name));
        if (entry.count > 1) button.append(el('span', 'chip-count', `×${entry.count}`));
        button.append(el('span', 'chip-remove', '✕'));
        button.addEventListener('click', () => this.actions.removeName(entry.name));
        chip.append(button);
        return chip;
      })
    );
    this._count.textContent = t('lobby.count', { n: total, max: MAX_MARBLES });
  }

  private memberButton(label: string, onClick: () => void) {
    const button = el('button', 'room-member-button', label);
    button.type = 'button';
    button.addEventListener('click', onClick);
    return button;
  }

  private addExtras(text: string) {
    this.notify('');
    if (text.trim()) this.actions.addNames(text);
  }

  private async copyLink() {
    try {
      await navigator.clipboard.writeText(this._link.value);
    } catch {
      // 클립보드를 쓸 수 없으면 직접 복사하도록 주소를 골라 준다
      this._link.focus();
      return;
    }
    this._copy.textContent = t('room.copied');
    window.clearTimeout(this._copiedTimer);
    this._copiedTimer = window.setTimeout(() => {
      this._copy.textContent = t('room.copy');
    }, COPIED_MS);
  }
}
