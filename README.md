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

### 초대방 (개발 중)

로비의 "초대방 만들기"를 누르면 방이 생기고, 초대 링크로 들어온 사람은 닉네임을 넣어 자기 구슬을 방에 올립니다. 맵은 방장이 고르고, 방장이 시작하면 모두 같은 카운트다운 뒤에 같은 경기와 같은 결과를 봅니다. 경기는 방장의 브라우저에서 돌고 나머지는 그 모습을 받아 그리므로, 방장이 탭을 뒤로 보내면 경기가 잠시 멈춥니다.

초대방은 방 서버(Cloudflare Workers + Durable Objects, `server/`)가 필요합니다. 개발할 때는 터미널을 하나 더 열어 방 서버를 같이 띄웁니다.

```shell
pnpm server:dev   # http://localhost:8787
```

경기 중에는 화면 아래의 이모지로 응원을 보낼 수 있고, 끝난 판은 결과 화면의 "결과 링크 복사"로 순위표 주소를 남길 수 있습니다(7일 동안 열립니다). 방장은 대기실에서 다른 사람을 내보내거나 방장 자리를 넘길 수 있습니다.

#### 초대방 배포

방 서버는 Cloudflare 계정으로 직접 배포합니다. 무료 플랜으로 됩니다.

1. `pnpm exec wrangler login` 으로 로그인합니다.
2. `package.json` 의 `server:deploy` 가 `ALLOWED_ORIGINS` 에 사이트 출처(`https://kudongku99.github.io`)를 넣어 올립니다. 다른 주소에 사이트를 올린다면 이 값을 바꿉니다. `server/wrangler.jsonc` 의 값은 로컬 개발용으로 비워 둡니다.
3. `pnpm server:deploy` 를 실행하면 `https://wonder-roulette-rooms.<계정>.workers.dev` 같은 주소가 나옵니다.
4. GitHub 저장소 Settings → Secrets and variables → Actions → Variables 에 `ROOM_SERVER_URL` 이라는 이름으로 그 주소를 넣습니다.
5. `main` 에 다시 올리면 Pages 빌드가 그 주소를 받아 초대방 버튼이 나타납니다.

직접 빌드할 때는 `VITE_ROOM_SERVER` 에 방 서버 주소를 넣어야 초대방 버튼이 보입니다.

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
