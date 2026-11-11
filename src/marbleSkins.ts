const SKIN_URLS: { name: string; url: URL }[] = [
  { name: '챔루', url: new URL('../assets/images/chamru.png', import.meta.url) },
  { name: '쿠빈', url: new URL('../assets/images/kubin.png', import.meta.url) },
  { name: '꽉변', url: new URL('../assets/images/kkwak.png', import.meta.url) },
  { name: '꽉변호사', url: new URL('../assets/images/kkwak.png', import.meta.url) },
  { name: '꽉 변호사', url: new URL('../assets/images/kkwak.png', import.meta.url) },
  { name: '주누피', url: new URL('../assets/images/junyoop.png', import.meta.url) },
  { name: '왈도쿤', url: new URL('../assets/images/waldokun.png', import.meta.url) },
];

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const img = new Image();
    img.addEventListener('load', () => {
      resolve(img);
    });
    img.src = url;
  });
}

/** 특정 이름의 구슬에 입히는 이미지 */
export class MarbleSkins {
  private _images: { [name: string]: HTMLImageElement } = {};

  async load(): Promise<void> {
    await Promise.all(
      SKIN_URLS.map(async ({ name, url }) => {
        this._images[name] = await loadImage(url.toString());
      })
    );
  }

  get(name: string): CanvasImageSource | undefined {
    return this._images[name];
  }
}
