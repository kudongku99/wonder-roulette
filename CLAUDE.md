# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트

구슬을 떨어뜨려 추첨하는 2D 게임 [lazygyu/roulette](https://github.com/lazygyu/roulette) 을 3D 로 리팩터링하는 프로젝트다. 원본 소스는 `../roulette/` 에 클론돼 있으며 **참조 전용이고 수정하지 않는다.** 원본 구조에 대한 상세 설명은 `../CLAUDE.md` 에 있다.

현재 상태: 10단계(맵 시각 개선과 환경설정)까지 끝났다. 6단계부터는 원본과의 기능 동등성을 내려놓고 3D 전용 추첨 게임으로 다시 짜는 중이다. 남은 것은 11단계(성능 측정, 실제 기기 확인, 배포 구성)다. 단계별 계획과 바뀐 결정은 `docs/roadmap.md` 에 있다.

## 명령어

패키지 매니저는 pnpm 이다.

```shell
pnpm install
pnpm dev                 # Vite 개발 서버, http://localhost:1236
pnpm build               # 타입 검사 후 dist/ 에 빌드
pnpm typecheck           # tsc --noEmit
pnpm lint                # biome check --fix (src, scripts, tests)
pnpm test                # vitest run
pnpm vitest run tests/simulate.test.ts      # 테스트 파일 하나만
pnpm vitest run -t 'parseName'              # 이름으로 테스트 하나만
pnpm simulate bench 6,16,30   # 렌더링 없이 물리만 돌려 맵별 골인 시각 분포 출력
pnpm simulate stuck 6,16,30   # 정지 판정 문턱 비교
pnpm simulate goals 6,16,30   # 골인 시각 전체를 JSON 으로 출력
```

`tests/simulate.test.ts` 가 물리 시뮬레이션 회귀 테스트다. `tests/fixtures/simulate-goals.json` 은 **원본 코드**(lazygyu/roulette `e9a9d22`)로 뽑은 골인 시각이며, 이 프로젝트의 물리와 맵이 같은 값을 내는지 비교한다. 테스트가 깨졌다고 이 프로젝트의 출력으로 기준 파일을 다시 만들면 안 된다. 물리나 맵 데이터를 의도적으로 바꾼 경우에만, 사용자 확인을 받고 갱신한다.

## 화면 흐름과 UI

```
로비 ──▶ 맵 선택 ──▶ 게임 화면 ──(시작)──▶ 진행 ──(1등 확정)──▶ 결과
                  ◀── 맵 선택으로                    다시 하기 → 게임 화면, 로비로 → 로비
```

- UI 는 프레임워크 없는 TypeScript 모듈이다(`src/ui/`). `index.html` 에는 모듈 진입 스크립트만 있고 인라인 스크립트와 `window` 전역은 없다. 스타일도 `src/index.ts` 가 가져온다.
- `ScreenMachine`(`screenMachine.ts`)이 화면 상태와 허용된 전환을 갖는다. 허용되지 않은 전환은 무시하고 `false` 를 돌려준다. 새 화면이나 전환을 넣을 때는 이 표를 먼저 고친다.
- `startApp`(`app.ts`)이 화면들과 게임을 잇는다. 화면이 바뀔 때 무엇을 보이고 게임에 무엇을 시킬지는 여기에만 있다. 화면 모듈(`Lobby`, `MapSelect`, `GameControls`)은 콜백만 받고 게임이나 다른 화면을 모른다.
- 이름 목록의 규칙(쉼표·줄바꿈 나누기, `이름*N`, 같은 이름 합치기, 총 100개 상한)은 DOM 없는 `nameList.ts` 에 있다. 저장은 `storage.ts` 가 `roulette3d:` 접두사 키로 한다. 원본의 `mbr_names` 는 읽지 않는다.
- 맵 선택의 썸네일은 맵 데이터로 런타임에 그린다(`stageThumbnail.ts`). 장애물을 2D 로 그리는 코드(`src/render/stage2d.ts`)는 미니맵과 같이 쓴다.
- 번역은 `src/i18n.ts` 다. 한국어 표가 키의 기준이고 영어 표는 같은 키를 모두 가져야 타입 검사를 통과한다. 화면 글자는 `t('키')` 로만 넣는다. 언어는 브라우저 언어로 정한다.
- 결과 화면은 따로 없다. 1등이 확정되면 HUD 의 순위표(`RankBoard`)가 화면 가운데로 커지고(`is-result`), 게임은 뒤에서 전원 골인까지 계속된다. 골인 전인 행은 반투명하다가 결승선을 지나면 불투명해진다.

## 로비 구슬 박스

- 로비 화면에서는 게임 월드 대신 `LobbyBox`(`src/lobbyBox.ts`)를 돌리고 그린다. 이름을 넣으면 구슬이 박스로 떨어지고, 칩을 지우면 그 구슬이 줄어들며 사라진다.
- 장식일 뿐이고 추첨과 무관하다. 게임과 다른 `Box2dPhysics` 인스턴스를 쓰며, 게임은 시작할 때 구슬을 출발 배치로 새로 만든다. 로비의 구슬 위치나 순서를 게임으로 넘기지 않는다.
- 박스는 맵 목록에 없는 내부 `StageDef` 라서 장애물·구슬 메시를 게임과 같은 렌더러로 그린다. 렌더러가 받는 구슬은 `MarbleBody`(위치, 색, 크기 배율)이고 게임의 `Marble` 과 로비의 구슬이 모두 이 모양이다.
- `Roulette.setLobby(목록 | null)` 이 로비 모드를 켜고 끈다. 켜져 있는 동안 게임 물리는 멈춰 있다.
- 가로로 넓은 화면에서는 이름 입력 카드가 왼쪽, 박스가 오른쪽에 온다. 그 기준 비율은 `lobbyBox.ts` 의 `WIDE_ASPECT` 와 `ui.scss` 의 미디어 쿼리 두 곳에 있으니 같이 고친다.

## 맵 바닥과 환경설정

- 맵 안팎은 `ProgressMap.reachableFrom(출발점)` 으로 나눈다. 구슬 출발 자리에서 벽을 피해 아래·옆으로, 올라가는 구역에서만 위로 퍼진 칸이 안쪽이다. 결승선 아래에서는 퍼지지 않는다(맵 둘레 여백으로 새지 않게).
- `src/render/stageFloor.ts` 의 `paintFloor` 가 이 칸으로 바닥 그림을 만든다. 3D 바닥(`FloorPlane`)과 맵 선택 썸네일이 같이 쓰고 색만 다르다. 바깥 색은 3D 배경판과 같아야 경계가 안 보인다. 로비 박스처럼 맵 목록에 없는 무대는 `WorldFrame.floor = false` 로 바닥을 깔지 않는다.
- 환경설정(`src/settings.ts`)은 기울기(도, −30 ~ 30, 기본 17), 그림자, 블룸이다. `SettingsStore` 가 저장하고 바뀌면 `Roulette.applySettings` → 렌더러로 바로 넘긴다. 패널은 `src/ui/settingsPanel.ts` 이고 모든 화면 오른쪽 아래에 있다.
- 결승 연출로 더 기우는 각도는 기본 기울기에 비례한다(`finishAngle` 의 세 번째 인자). 기본이 0 이면 더 기울지 않고, 음수면 그쪽으로 더 기운다. 합계는 ±60도(`MAX_TILT`)로 자른다.
- 미니맵의 화면 범위는 직사각형이 아니라 화면 네 모서리를 구슬 평면에 투영한 사각형(`groundQuad`)이다. 지금 카메라는 맵 위쪽에서 내려다보므로 기울이면 화면 아래쪽(먼 쪽)이 넓은 사다리꼴이 된다. 그림자 범위도 이 사각형으로 잡는다.

## 게임 규칙

- 당첨자는 항상 1등이다. `Roulette` 은 1등이 골인하면 `winner` 이벤트를, 모든 순위가 정해지면 `finish` 이벤트를 낸다. 남은 구슬이 하나면 그 구슬은 골인하지 않아도 순위가 정해진 것으로 본다.
- 줌인과 슬로모션 연출은 1등이 정해질 때까지만 건다. 첫 골인 뒤에는 대상 구슬이 없어 연출 강도가 0 이고, 카메라는 남은 선두를 따라가기만 한다.
- 구슬은 총 100개(`MAX_MARBLES`)까지다. 로비가 입력 단계에서 막고, `Roulette.setMarbles` 도 넘는 항목을 뺀다.

## 렌더 구조

화면은 WebGL 캔버스 하나와 그 위에 겹친 HTML HUD 로 이뤄진다.

- `ThreeWorldRenderer`(`src/render/three/`)가 월드(배경, 장애물, 구슬, 축하 효과)를 그린다. 자기 WebGL 캔버스를 `attach` 로 화면에 직접 붙이고 크기 변화에 맞춰 해상도를 고친다. WebGL 렌더러를 만들지 못하면 생성자가 예외를 던지고, `src/index.ts` 가 게임 대신 안내 문구만 보여준다.
- `WorldFrame`(`src/render/worldFrame.ts`)이 월드 한 프레임의 입력이다. 물리 좌표 그대로의 카메라 `(x, y, zoom)`, 엔티티 상태, 구슬, 골인 축하 효과(`GoalBurst`)를 담는다. 새 그리기 요소를 넣을 때는 여기에 필요한 값을 싣는다.
- `renderer.viewSize` 는 보이는 월드 범위의 기준이 되는 화면 크기다(줌 1 일 때 이 크기 / `initialZoom` 만큼 보인다). 캔버스 픽셀 크기와는 별개다. 카메라 추적과 미니맵의 화면 범위 표시가 이 값을 쓴다.
- HUD 는 `src/hud/` 의 HTML 모듈이다. `Roulette` 은 HUD 를 모른다. 프레임을 그릴 때마다 `onFrame` 으로 읽기 전용 상태 `HudFrame`(순위, 골인한 구슬, 1등, 카메라, 화면에 보이는 구슬의 위치)을 넘기고, `Hud.update` 가 그것을 읽어 그린다. HUD 가 바깥에 시키는 일은 `HudActions`(빨리 감기, 카메라 이동, 다시 하기, 로비로) 뿐이며 `src/ui/app.ts` 가 잇는다.
- HUD 모듈은 달라진 것만 DOM 에 쓴다. `RankBoard` 는 구슬마다 행 하나를 계속 쓰고 순서는 CSS `order` 로 정한다. `MarbleLabels` 는 이름표 요소를 재사용하며 프레임마다 `transform` 만 바꾼다. 프레임마다 도는 코드에서 레이아웃을 읽지 않는다(HUD 크기는 `ResizeObserver` 로 받아 둔다).
- 미니맵은 틀만 HTML 이고 맵·구슬·화면 범위는 작은 2D 캔버스에 그린다(`src/hud/minimap.ts`).
- 스타일은 `assets/style.scss`(바탕과 디자인 토큰), `hud.scss`, `ui.scss` 로 나뉜다. 토큰은 CSS 변수(네온 아케이드: 색, 발광 테두리, 간격, 글꼴)이고 새 화면도 이 토큰을 쓴다. 글꼴(Black Han Sans, Pretendard)은 npm 패키지로 번들에 들어가며 외부 CDN 을 쓰지 않는다.
- 색 중 3D 와 미니맵이 같이 쓰는 것은 `src/data/constants.ts` 의 `theme` 이다. 테마를 고르는 코드는 없다.
- `Marble`, `Camera` 는 그리기 코드가 없는 상태 객체다. 이 클래스들에 `render` 메서드를 다시 넣지 않는다.

### 3D 렌더러

- 좌표 변환은 두 곳뿐이다. `_world` 그룹의 `scale.y = -1` 과 `applyView2d`(`cameraRig.ts`). 그 아래에 붙는 메시(`StageMeshes`, `MarbleMeshes`)는 물리 좌표와 물리 각도를 그대로 쓴다. 메시 코드에서 y 나 각도의 부호를 따로 뒤집지 않는다.
- `applyView2d` 는 2D 카메라의 `(x, y, zoom)` 을 원근 카메라 거리로 바꾼다. z = 0 평면에서 보이는 세로 범위가 2D 카메라와 같아지게 해서 미니맵의 화면 범위 표시와 카메라 추적 로직이 그대로 맞는다. 환경설정의 기울기만큼 위에서 내려다보고(기본값 `CAMERA_TILT`), 결승 연출로 2D 줌이 1 을 넘으면 `finishAngle` 이 줌과 기본 기울기에 비례해 더 기울이고 좌우로 천천히 돈다. 연출 판정 자체는 2D 카메라의 줌 값을 읽을 뿐 따로 하지 않는다.
- `StageMeshes.sync` 는 엔티티의 `shape` 객체 동일성으로 메시를 대응시킨다. `physics.getEntities()` 가 매 프레임 새 객체를 돌려주지만 `shape` 는 맵 데이터의 객체 그대로이기 때문이다. polyline 은 선분마다 얇은 박스를 만들어 하나로 합친다.
- 구슬은 전부 `InstancedMesh` 하나이고, 구슬 수가 용량을 넘으면 두 배씩 키워 새로 만든다.
- 구슬 이름표는 3D 로 만들지 않는다. `projectMarble`(`marbleProjection.ts`)이 구슬 중심과 반지름을 카메라로 투영해 화면 비율 좌표를 내고, HUD 의 `MarbleLabels` 가 그 자리에 HTML 요소를 놓는다.
- 조명은 방향광 하나(그림자 포함), 약한 주변광, `RoomEnvironment` 환경광이다. 그림자를 받는 배경판과 그림자 카메라 범위는 매 프레임 `followView` 가 보이는 곳으로 옮긴다.
- 장애물 재질에는 항상 자체 발광이 들어가고 `EffectComposer` 로 블룸을 건다. 환경설정에서 블룸을 끄면 블룸 패스만 꺼지고 발광은 남는다. 그림자를 끄면 방향광의 `castShadow` 를 끈다. 밝기 값들은 화면을 보며 맞춘 것이라, 바꿀 때는 화면으로 확인한다.
- 골인 축하 효과(`ConfettiMeshes`)는 시드와 경과 시간만으로 조각 위치를 계산해 프레임 사이 상태가 없다.
- 디버그 그림은 `DebugPlane` 이 2D 캔버스에 한 번 그려 장애물 뒤쪽 평면의 텍스처로 쓴다. `WorldDebugDraw` 는 월드 좌표로 그리는 2D 함수 그대로다.
- WebGL 이 필요한 `ThreeWorldRenderer` 자체는 테스트하지 않는다. GL 없이 돌아가는 `cameraRig`, `StageMeshes`, `MarbleMeshes`, `ConfettiMeshes`, `projectMarble` 을 단위 테스트한다. HUD 와 UI 는 DOM 이 필요 없는 부분(`rankRows`, `nameList`, `ScreenMachine`, `i18n`, `stageRangeX`)만 테스트한다. `LobbyBox` 는 가짜 `IPhysics` 를 넣어 테스트한다. 맵 안쪽 칸(`reachableFrom`), 화면 사다리꼴(`groundQuad`), 설정 읽기(`parseSettings`)도 DOM 없이 테스트한다. 테스트 환경에 DOM 이 없으므로 규칙은 DOM 을 만지는 클래스 밖에 둔다. `DebugPlane` 은 DOM 캔버스가 필요해 테스트가 없다. 화면은 개발 서버에서 직접 확인한다.

## 원본과 달라진 점

- 빌드가 Parcel 에서 Vite 로 바뀌었다. 아이콘과 `manifest.json` 은 `public/` 에 있고, `assets/` 는 번들에 포함되는 스타일과 이미지다.
- 원작자 인프라에 닿는 것을 제거했다: 광고, 키워드 스프라이트, 맵 공유마당, 분석 스크립트, 서비스워커. `StageDef.adBoards` 는 맵 형식 호환을 위해 타입에만 남아 있고 그리지 않는다.
- 게임 기능을 줄였다(6단계). 스킬(충격파), 녹화, 라이트 테마, 가중치(`이름/3`), 당첨 순위 설정(당첨자는 항상 1등), 구슬 스킨, 맵 파일 불러오기, `?names=` 주소 파라미터, 2D 렌더러가 없다. 이름 문법은 `이름*N` 만 남았고 `/` 는 이름의 일부다.
- 원본은 당첨자가 정해지면 게임이 끝나지만, 여기서는 1등이 나와도 전원 골인까지 진행한다.
- 원본의 2D 캔버스 그리기는 남아 있지 않다. `Marble`, `Camera` 의 그리기 코드, `GameObject` / `UIObject` 인터페이스, 캔버스 순위표·미니맵, 장면·표시 캔버스 합성을 없앴다. 빨리 감기는 캔버스를 누르고 있는 방식에서 HUD 의 켜고 끄는 버튼으로 바뀌었다. 원본에서 비공개 커스텀 빌드용으로 열어둔 `onBeforeEntities` / `onAfterScene` 훅도 없다.
- 원본의 `index.html` 인라인 스크립트와 설정 패널은 없다. UI 는 `src/ui/` 로 새로 썼고 번역 키도 새로 만들었다.
- `tsconfig.json` 의 `useDefineForClassFields: false` 는 원본(target es2017)의 클래스 필드 동작을 유지하기 위한 것이다.

## 확정된 방향: 2.5D

**물리는 2D(Box2D) 그대로 두고 렌더만 3D 로 바꾼다.** 이 결정에서 따라 나오는 규칙:

- 물리 코드(`IPhysics`, `Box2dPhysics`)와 맵 데이터 형식(`StageDef`, `MapEntity`)은 원본과 동일하게 유지한다(쓰지 않게 된 `IPhysics.impact` 만 뺐다). 맵 형식을 바꾸면 원본 맵과의 호환이 깨진다.
- 물리 시뮬레이션은 원본과 같아야 한다. 원본의 `scripts/simulate.ts` 는 `Math.random` 을 시드 고정해 물리만 돌리므로, 같은 조건에서 원본과 출력이 일치하는지가 회귀 기준이다. 게임 규칙(스킬, 가중치, 당첨 순위, 종료 시점)은 원본과 달라도 된다.
- 순위 계산(`ProgressMap`), 카메라 추적 로직, 슬로모션·줌 연출 판정은 2D 좌표만 다루므로 그대로 가져온다. 3D 는 이 값들을 화면에 옮기는 계층에서만 등장한다.
- 깊이(z) 축은 시각 표현 전용이다. 게임 로직이 z 값에 의존하게 만들지 않는다.

## 기술스택

| 영역 | 선택 |
|---|---|
| 3D 렌더링 | Three.js (프레임워크 없이 바닐라 TypeScript) |
| 물리 | box2d-wasm (원본 유지) |
| 빌드 | Vite |
| 테스트 | Vitest + 원본에서 가져온 `simulate` 스크립트 |
| 패키지 매니저 | pnpm |
| 린트·포맷 | Biome (원본 설정 유지: 2칸 스페이스, 작은따옴표, 세미콜론, 줄 폭 120) |

## 설계 원칙

- **좌표계**: 물리 월드는 y 가 아래로 증가한다(중력 `(0, 10)`). Three.js 는 y 가 위다. 변환은 3D 렌더 계층 한 곳에서만 하고, 게임 로직에는 물리 좌표만 흐르게 한다.
- **HUD 는 HTML/CSS**: 화면에 붙는 캔버스는 WebGL 캔버스 하나다. 순위표, 이름표, Winner 표시 같은 2D 표시는 캔버스에 그리지 않고 `src/hud/` 의 HTML 로 만든다.
- **구슬은 `InstancedMesh`**: 구슬마다 메시를 만들지 않는다. 구슬 수 상한은 총 100개다.
- **카메라**: 원본 `Camera` 의 `(x, y, zoom)` 을 계산 결과로 계속 쓰고, 이를 원근 카메라의 위치·거리로 매핑하는 어댑터를 둔다. 추적 로직을 3D 용으로 다시 쓰지 않는다.

## 제약

- **상표**: 원본의 MIT 라이선스는 소스 코드에만 적용된다. "Marble Roulette" / "마블 룰렛" 및 혼동될 수 있는 유사 명칭을 이 프로젝트의 이름·브랜딩(패키지명, 타이틀, manifest, README 제목)에 쓰지 않는다. "based on Marble Roulette by lazygyu" 같은 사실 표기는 허용된다.
- **라이선스 고지**: 원본 코드를 복사해 올 때 원본의 MIT 저작권 고지를 함께 유지한다.
- **원작자 인프라**: 원본은 umami 분석 스크립트, 광고 서버, 맵 공유마당 API(`marblerouletteshop.com`), 서비스워커 kill switch(`scripts/build-sw.js`)에 연결돼 있다. 이 연결들은 가져오지 않는다.
- **git 계정**: 이 저장소는 로컬 설정으로 `kudongku <kudongku@gmail.com>` 을 쓴다(전역 설정과 다르다).
