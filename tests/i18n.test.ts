import { afterEach, expect, test } from 'vitest';
import { detectLocale, setLocale, stageTitle, t } from '../src/i18n';

afterEach(() => setLocale('en'));

test('브라우저 언어가 한국어일 때만 한국어를 쓴다', () => {
  expect(detectLocale('ko-KR')).toBe('ko');
  expect(detectLocale('KO')).toBe('ko');
  expect(detectLocale('en-US')).toBe('en');
  expect(detectLocale('ja')).toBe('en');
});

test('번역문의 자리를 값으로 채운다', () => {
  setLocale('ko');
  expect(t('lobby.count', { n: 3, max: 100 })).toBe('구슬 3 / 100');

  setLocale('en');
  expect(t('lobby.count', { n: 3, max: 100 })).toBe('Marbles 3 / 100');
});

test('맵 제목은 번역이 있으면 번역을, 없으면 제목 그대로를 쓴다', () => {
  setLocale('ko');

  expect(stageTitle('BubblePop')).toBe('버블팝');
  expect(stageTitle('My custom map')).toBe('My custom map');
});
