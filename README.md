# Wonder Roulette

구슬을 떨어뜨려 당첨자를 뽑는 3D 추첨 게임입니다. 저장소 폴더 이름은 개발을 시작할 때 붙인 `roulette-3d` 그대로입니다.

[Marble Roulette by lazygyu](https://github.com/lazygyu/roulette) 의 소스 코드를 기반으로 하며, 원본의 2D 캔버스 렌더링을 3D 로 바꾸는 리팩터링 프로젝트입니다. 원작자와는 관련이 없는 개인 프로젝트입니다.

## 현재 상태

원본과 같은 기능을 유지하는 대신 3D 전용 추첨 게임으로 다시 짜는 중입니다. 원본에 있던 스킬, 녹화, 라이트 테마, 가중치, 당첨 순위 설정, 2D 화면은 걷어냈고, 당첨자는 항상 1등입니다.

화면은 로비(이름 입력) → 맵 선택 → 게임 → 결과 순서로 흐릅니다. 1등이 정해지면 순위표가 화면 가운데로 커지고, 나머지 구슬이 모두 들어올 때까지 게임은 뒤에서 계속됩니다. 게임 화면을 끌면 카메라 각도가 바뀝니다. 위아래로 끌면 기울기, 좌우로 끌면 옆으로 도는 각도이고(각각 −30° ~ 30°), 휠이나 핀치로 확대·축소(0.5 ~ 2.5배)합니다. 두 번 누르면 처음 시점으로 돌아갑니다. 계획과 진행 상황은 [docs/roadmap.md](docs/roadmap.md) 를 참고해 주세요.

바로 해 보기: https://kudongku99.github.io/wonder-roulette/

## 실행

```shell
pnpm install
pnpm dev
```

개발 서버는 http://localhost:1236 에서 열립니다. WebGL 을 쓸 수 있는 브라우저가 필요합니다.

로비에서 이름을 입력하고 엔터를 치면 목록에 들어가고 구슬이 박스로 떨어집니다. 쉼표로 구분한 여러 이름을 한 번에 넣을 수 있고, `이름*3` 처럼 쓰면 같은 이름의 구슬을 여러 개 넣습니다. 구슬은 모두 합쳐 100개까지이며, 입력한 이름은 브라우저에 저장됩니다.

```shell
pnpm build      # 프로덕션 빌드
pnpm test       # 테스트
pnpm lint       # 린트와 포맷
```

## 배포

`main` 브랜치에 올리면 GitHub Actions(`.github/workflows/deploy.yml`)가 테스트와 빌드를 거쳐 GitHub Pages 에 배포합니다. 처음 한 번은 저장소 Settings → Pages → Source 를 **GitHub Actions** 로 바꿔야 합니다.

## 접근 방식

물리 시뮬레이션은 원본과 같은 2D(Box2D) 를 그대로 쓰고, 화면 표현만 3D 로 바꾸는 2.5D 방식입니다.

- 원본의 맵 데이터 형식을 그대로 씁니다.
- 물리를 건드리지 않으므로 같은 조건에서 물리 시뮬레이션 결과가 원본과 같습니다.
- 순위 계산, 카메라 추적, 슬로모션 연출 로직을 재사용합니다.

## 기술스택

| 영역 | 선택 |
|---|---|
| 3D 렌더링 | Three.js |
| 물리 | box2d-wasm |
| 언어 | TypeScript |
| 빌드 | Vite |
| 테스트 | Vitest |
| 린트·포맷 | Biome |

## 라이선스와 출처

원본 소스 코드는 MIT License 로 배포되며, 원본의 저작권 고지는 [LICENSE](LICENSE) 에 그대로 있습니다.

글꼴 Black Han Sans 와 Pretendard 는 SIL Open Font License 1.1 로 배포되며 npm 패키지로 번들에 포함됩니다.

"Marble Roulette"™ 및 "마블 룰렛"™ 은 lazygyu 의 상표이며, 이 프로젝트는 해당 명칭을 프로젝트명이나 브랜딩으로 사용하지 않습니다.
