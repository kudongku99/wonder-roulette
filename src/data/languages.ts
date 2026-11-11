export const Translations = {
  en: {
    'Enter names below': 'Enter names below',
    Shuffle: 'Shuffle',
    Start: 'Start',
    Map: 'Map',
    Settings: 'Settings',
    'Wheel of fortune': 'Wheel of fortune',
    BubblePop: 'BubblePop',
    'Pot of greed': 'Pot of greed',
    'Yoru ni Kakeru': 'Into The Night (by item4)',
    'Input names separated by commas or line feed here': 'Input names separated by commas or line feed here',
    'The result has been copied': 'The result has been copied',
    'Fast forward': 'Fast forward',
    'Up to 100 marbles. Entries over the limit are left out.':
      'Up to 100 marbles. Entries over the limit are left out.',
    'This browser cannot display 3D graphics (WebGL).': 'This browser cannot display 3D graphics (WebGL).',
  },
  ko: {
    'Enter names below': '이름들을 입력하세요',
    Shuffle: '섞기',
    Start: '시작',
    Map: '맵',
    Settings: '설정',
    'Wheel of fortune': '운명의 수레바퀴',
    BubblePop: '버블팝',
    'Pot of greed': '욕망의 항아리',
    'Yoru ni Kakeru': '밤을 달리다 (by item4)',
    'Input names separated by commas or line feed here': '이름들을 쉼표나 엔터로 구분해서 넣어주세요',
    'The result has been copied': '결과가 복사되었습니다',
    'Fast forward': '빨리 감기',
    'Up to 100 marbles. Entries over the limit are left out.': '구슬은 100개까지입니다. 넘는 항목은 빠집니다.',
    'This browser cannot display 3D graphics (WebGL).': '이 브라우저에서는 3D 그래픽(WebGL)을 표시할 수 없습니다.',
  },
} as const;

export type TranslatedLanguages = keyof typeof Translations;

export type TranslationKeys = keyof (typeof Translations)[TranslatedLanguages];
