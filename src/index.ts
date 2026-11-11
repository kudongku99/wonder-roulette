import './localization';
import { initMapSelector } from './mapSelector';
import options from './options';
import { Roulette } from './roulette';

const roulette = new Roulette();

(window as any).roulette = roulette;
(window as any).options = options;

// index.html 이 초기화할 때 부른다
(window as any).initMapSelector = (onMapChange: () => void, toast: (key: string) => void) =>
  initMapSelector({ roulette, onMapChange, toast });
