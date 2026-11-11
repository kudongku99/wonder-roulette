/** 클래스 이름과 글자를 가진 요소를 만든다 */
export function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string) {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** 구슬 색. 3D 구슬과 같은 색상에 글자로 읽히는 밝기다 */
export function marbleColor(hue: number) {
  return `hsl(${hue} 100% 75%)`;
}
