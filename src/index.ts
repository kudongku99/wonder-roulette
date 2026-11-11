import { translate } from './localization';
import { initMapSelector } from './mapSelector';
import { Roulette } from './roulette';

try {
  const roulette = new Roulette();

  (window as any).roulette = roulette;

  // index.html 이 초기화할 때 부른다
  (window as any).initMapSelector = (onMapChange: () => void) => initMapSelector({ roulette, onMapChange });
} catch (e) {
  console.error(e);
  // WebGL 을 쓸 수 없는 환경. 게임 화면 대신 안내만 보여준다
  document.documentElement.classList.add('unsupported');
  const notice = document.createElement('p');
  notice.className = 'unsupported-notice';
  notice.textContent = translate('This browser cannot display 3D graphics (WebGL).');
  document.body.appendChild(notice);
}
