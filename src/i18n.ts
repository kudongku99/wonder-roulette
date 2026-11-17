const ko = {
  'lobby.heading': '참가자 이름',
  'lobby.placeholder': '이름을 입력하고 Enter',
  'lobby.hint': '쉼표로 여러 명을 한 번에 넣을 수 있고, 이름*3 처럼 쓰면 구슬 3개가 들어갑니다.',
  'lobby.count': '구슬 {n} / {max}',
  'lobby.empty': '아직 아무도 없습니다',
  'lobby.limit': '구슬은 {max}개까지입니다. 들어가지 못한 항목: {names}',
  'lobby.remove': '{name} 지우기',
  'lobby.clear': '모두 지우기',
  'lobby.next': '다음',
  'lobby.invite': '초대방 만들기',
  'lobby.inviteFailed': '초대방을 만들지 못했습니다. 잠시 뒤에 다시 해 주세요.',
  'room.heading': '초대방',
  'room.inviteHint': '이 링크를 보내면 같은 방으로 들어옵니다.',
  'room.copy': '링크 복사',
  'room.copied': '복사됨',
  'room.connecting': '연결 중…',
  'room.reconnecting': '연결이 끊겨 다시 연결하는 중…',
  'room.notFound': '방을 찾을 수 없습니다. 링크가 오래됐을 수 있습니다.',
  'room.roomFull': '방이 가득 찼습니다.',
  'room.replaced': '다른 창에서 같은 자리로 들어와 이 창의 연결을 끊었습니다.',
  'room.marblesFull': '구슬이 가득 차서 참가할 수 없습니다.',
  'room.nickname': '내 닉네임',
  'room.nicknamePlaceholder': '닉네임을 넣으면 내 구슬이 생깁니다',
  'room.join': '참가',
  'room.rename': '바꾸기',
  'room.withdraw': '구슬 빼기',
  'room.members': '접속자 {n}',
  'room.host': '방장',
  'room.me': '나',
  'room.watching': '관전 중',
  'room.away': '연결 끊김',
  'room.map': '맵',
  'room.changeMap': '맵 바꾸기',
  'room.extras': '이름 직접 넣기',
  'room.extrasHint': '접속하지 않은 사람의 이름은 방장이 넣습니다. 이름*3 처럼 쓰면 구슬 3개가 들어갑니다.',
  'room.leave': '나가기',
  'room.start': '시작',
  'room.waitHost': '방장이 시작하기를 기다리는 중입니다.',
  'room.startFailed': '참가자가 바뀌어 시작하지 못했습니다. 다시 눌러 주세요.',
  'room.stalled': '방장 화면이 멈춰 있습니다. 돌아오면 이어집니다.',
  'result.room': '대기실로',
  'result.share': '결과 링크 복사',
  'room.kicked': '방장이 방에서 내보냈습니다.',
  'room.transfer': '방장 넘기기',
  'room.kick': '내보내기',
  'hud.cheer': '응원 보내기',
  'hud.linkCopied': '결과 링크가 복사되었습니다',
  'shared.heading': '추첨 결과',
  'shared.loading': '결과를 불러오는 중…',
  'shared.missing': '결과를 찾을 수 없습니다. 링크가 오래됐을 수 있습니다.',
  'map.heading': '맵 선택',
  'map.length': '길이 {n}m',
  'map.back': '이름 입력으로',
  'game.maps': '맵 선택',
  'game.shuffle': '섞기',
  'game.start': '시작',
  'hud.fastForward': '빨리 감기',
  'hud.copied': '결과가 복사되었습니다',
  'result.replay': '다시 하기',
  'result.lobby': '로비로',
  unsupported: '이 브라우저에서는 3D 그래픽(WebGL)을 표시할 수 없습니다.',
  'stage.Wheel of fortune': '운명의 수레바퀴',
  'stage.BubblePop': '버블팝',
  'stage.Pot of greed': '욕망의 항아리',
  'stage.Yoru ni Kakeru': '밤을 달리다 (by item4)',
};

export type MessageKey = keyof typeof ko;

const en: Record<MessageKey, string> = {
  'lobby.heading': 'Players',
  'lobby.placeholder': 'Type a name and press Enter',
  'lobby.hint': 'Separate several names with commas. Write name*3 to add three marbles.',
  'lobby.count': 'Marbles {n} / {max}',
  'lobby.empty': 'Nobody here yet',
  'lobby.limit': 'Up to {max} marbles. Left out: {names}',
  'lobby.remove': 'Remove {name}',
  'lobby.clear': 'Clear all',
  'lobby.next': 'Next',
  'lobby.invite': 'Create invite room',
  'lobby.inviteFailed': 'Could not create a room. Please try again in a moment.',
  'room.heading': 'Invite room',
  'room.inviteHint': 'Anyone with this link joins the same room.',
  'room.copy': 'Copy link',
  'room.copied': 'Copied',
  'room.connecting': 'Connecting…',
  'room.reconnecting': 'Connection lost. Reconnecting…',
  'room.notFound': 'Room not found. The link may have expired.',
  'room.roomFull': 'This room is full.',
  'room.replaced': 'Another window took over this seat, so this window was disconnected.',
  'room.marblesFull': 'The room has no marble slots left.',
  'room.nickname': 'My nickname',
  'room.nicknamePlaceholder': 'Enter a nickname to get your marble',
  'room.join': 'Join',
  'room.rename': 'Rename',
  'room.withdraw': 'Remove my marble',
  'room.members': 'Online {n}',
  'room.host': 'Host',
  'room.me': 'Me',
  'room.watching': 'Watching',
  'room.away': 'Disconnected',
  'room.map': 'Map',
  'room.changeMap': 'Change map',
  'room.extras': 'Add names by hand',
  'room.extrasHint': 'The host adds names for people who are not connected. Write name*3 to add three marbles.',
  'room.leave': 'Leave',
  'room.start': 'Start',
  'room.waitHost': 'Waiting for the host to start.',
  'room.startFailed': 'The player list changed, so the game did not start. Please try again.',
  'room.stalled': "The host's screen is paused. It will continue when they return.",
  'result.room': 'Waiting room',
  'result.share': 'Copy result link',
  'room.kicked': 'The host removed you from the room.',
  'room.transfer': 'Make host',
  'room.kick': 'Remove',
  'hud.cheer': 'Send a cheer',
  'hud.linkCopied': 'The result link has been copied',
  'shared.heading': 'Draw result',
  'shared.loading': 'Loading the result…',
  'shared.missing': 'Result not found. The link may have expired.',
  'map.heading': 'Choose a map',
  'map.length': 'Length {n}m',
  'map.back': 'Back to names',
  'game.maps': 'Maps',
  'game.shuffle': 'Shuffle',
  'game.start': 'Start',
  'hud.fastForward': 'Fast forward',
  'hud.copied': 'The result has been copied',
  'result.replay': 'Play again',
  'result.lobby': 'Lobby',
  unsupported: 'This browser cannot display 3D graphics (WebGL).',
  'stage.Wheel of fortune': 'Wheel of fortune',
  'stage.BubblePop': 'BubblePop',
  'stage.Pot of greed': 'Pot of greed',
  'stage.Yoru ni Kakeru': 'Into The Night (by item4)',
};

const messages = { ko, en };
export type Locale = keyof typeof messages;

/** 브라우저 언어가 한국어면 한국어, 아니면 영어 */
export function detectLocale(language: string): Locale {
  return language.toLowerCase().startsWith('ko') ? 'ko' : 'en';
}

let locale: Locale = typeof navigator === 'undefined' ? 'en' : detectLocale(navigator.language);

export function setLocale(next: Locale) {
  locale = next;
}

export function getLocale(): Locale {
  return locale;
}

/** 번역문. {이름} 자리는 params 의 값으로 채운다 */
export function t(key: MessageKey, params: Record<string, string | number> = {}): string {
  return messages[locale][key].replace(/\{(\w+)\}/g, (whole, name) => (name in params ? String(params[name]) : whole));
}

/** 맵 제목. 번역이 없는 맵은 제목 그대로다 */
export function stageTitle(title: string): string {
  const key = `stage.${title}`;
  return key in messages[locale] ? messages[locale][key as MessageKey] : title;
}
