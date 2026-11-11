import '@fontsource/black-han-sans/korean-400.css';
import '@fontsource/black-han-sans/latin-400.css';
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import '../assets/style.scss';
import '../assets/hud.scss';
import '../assets/ui.scss';
import { getLocale, t } from './i18n';
import { Roulette } from './roulette';
import { startApp } from './ui/app';

document.documentElement.lang = getLocale();

try {
  const roulette = new Roulette();
  roulette.ready.then(() => startApp(document.body, roulette));
} catch (e) {
  console.error(e);
  // WebGL 을 쓸 수 없는 환경. 게임 화면 대신 안내만 보여준다
  const notice = document.createElement('p');
  notice.className = 'unsupported-notice';
  notice.textContent = t('unsupported');
  document.body.appendChild(notice);
}
