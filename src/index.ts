import '@fontsource/black-han-sans/korean-400.css';
import '@fontsource/black-han-sans/latin-400.css';
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import { Hud } from './hud/hud';
import { translate } from './localization';
import { initMapSelector } from './mapSelector';
import { Roulette } from './roulette';

try {
  const roulette = new Roulette();
  const hud = new Hud(document.body, {
    setFastForward: (on) => roulette.setFastForward(on),
    lookAt: (pos) => roulette.lookAt(pos),
  });
  roulette.onFrame((frame) => hud.update(frame));

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
