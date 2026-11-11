import { type TranslatedLanguages, type TranslationKeys, Translations } from './data/languages';

const defaultLocale: TranslatedLanguages = 'en';
let locale: TranslatedLanguages | undefined;

function getBrowserLocale() {
  return navigator.language.split('-')[0];
}

function supportedLocale(name: string): TranslatedLanguages {
  const lower = name.toLocaleLowerCase();
  return lower in Translations ? (lower as TranslatedLanguages) : defaultLocale;
}

function translateElement(element: Element) {
  if (!(element instanceof HTMLElement) || !locale) return;

  const prop = element.getAttribute('data-trans');

  if (prop) {
    const key = (element.getAttribute(prop) || '').trim();
    if (key && key in Translations[locale]) {
      element.setAttribute(prop, Translations[locale][key as TranslationKeys]);
    }
  } else {
    const key = element.innerText.trim();
    if (key && key in Translations[locale]) {
      element.innerText = Translations[locale][key as TranslationKeys];
    }
  }
}

function translatePage() {
  document.querySelectorAll('[data-trans]').forEach(translateElement);
}

function setLocale(newLocale: string) {
  if (newLocale === locale) return;

  document.documentElement.lang = newLocale;

  locale = supportedLocale(newLocale);
  translatePage();
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('localization loaded');
  const browserLocale = getBrowserLocale();
  console.log('detected locale: ', browserLocale);
  setLocale(browserLocale);
});

/** 요소가 아닌 문자열(confirm 등) 번역. 번역이 없으면 원문 */
export function translate(key: string): string {
  // 페이지가 다 읽히기 전에 불릴 수 있어, 아직 언어를 정하지 않았으면 브라우저 언어로 본다
  const table = Translations[locale ?? supportedLocale(getBrowserLocale())] as Record<string, string>;
  return table[key] ?? key;
}

(window as any).translateElement = translateElement;
