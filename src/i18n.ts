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
  'settings.open': '환경설정',
  'settings.title': '환경설정',
  'settings.tilt': '기울기',
  'settings.tiltReset': '기본값',
  'settings.shadows': '그림자',
  'settings.bloom': '빛 번짐',
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
  'settings.open': 'Settings',
  'settings.title': 'Settings',
  'settings.tilt': 'Tilt',
  'settings.tiltReset': 'Reset',
  'settings.shadows': 'Shadows',
  'settings.bloom': 'Glow',
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
