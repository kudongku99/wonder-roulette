# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트

구슬을 떨어뜨려 추첨하는 2D 게임 [lazygyu/roulette](https://github.com/lazygyu/roulette) 을 3D 로 리팩터링하는 프로젝트다. 원본 소스는 `../roulette/` 에 클론돼 있으며 **참조 전용이고 수정하지 않는다.** 원본 구조에 대한 상세 설명은 `../CLAUDE.md` 에 있다.

현재 상태: 2단계(렌더 경계 분리)까지 끝났다. 월드 그리기가 교체 가능한 `WorldRenderer` 뒤로 옮겨졌고, 구현은 아직 2D 캔버스 하나뿐이라 화면은 원본과 같다. 단계별 계획과 진행 상황은 `docs/roadmap.md` 가 기준이며, 단계를 끝내면 그 문서의 체크박스를 갱신한다.

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

`tests/simulate.test.ts` 가 추첨 결과 회귀 테스트다. `tests/fixtures/simulate-goals.json` 은 **원본 코드**(lazygyu/roulette `e9a9d22`)로 뽑은 골인 시각이며, 이 프로젝트의 물리와 맵이 같은 값을 내는지 비교한다. 테스트가 깨졌다고 이 프로젝트의 출력으로 기준 파일을 다시 만들면 안 된다. 물리나 맵 데이터를 의도적으로 바꾼 경우에만, 사용자 확인을 받고 갱신한다.

`tests/worldRender.test.ts` 는 2D 월드 렌더러가 캔버스에 내는 호출 순서를 `tests/fixtures/world-render-calls.json` 과 비교한다. 이 기준 파일은 렌더 경계를 분리하기 **전** 코드로 기록한 것이라, 2D 화면이 원본과 같게 유지되는지 확인하는 용도다. 2D 렌더러의 그리기를 의도적으로 바꿀 때만 갱신한다.

## 렌더 구조

- `WorldRenderer`(`src/render/worldRenderer.ts`)가 월드(배경, 장애물, 이펙트, 구슬)를 그리는 인터페이스다. `render(target, frame)` 은 2D 장면 캔버스 컨텍스트를 받아 그 캔버스 전체를 채운다. 3D 구현도 같은 시그니처로, WebGL 로 그린 결과를 `target` 에 옮겨 그리면 된다.
- `WorldFrame` 이 한 프레임의 입력이다. 물리 좌표 그대로의 카메라 `(x, y, zoom)`, 엔티티 상태, 구슬, 이펙트, 테마, 당첨 강조 범위, 스킨 조회 함수를 담는다.
- 현재 구현은 `Canvas2dWorldRenderer` 하나다. 렌더러 교체 지점은 `RouletteRenderer.createWorldRenderer()` 다.
- `RouletteRenderer` 는 캔버스 생성·리사이즈, 월드 렌더러 호출, 그 위의 HUD(`UIObject[]`, 파티클, 당첨자 표시), 표시용 캔버스 복사를 맡는다.
- `Marble`, `Camera`, `SkillEffect` 는 그리기 코드가 없는 상태 객체다. 그릴 때 필요한 값은 `marble.coolTimeRatio`, `effect.progress` 같은 읽기 전용 값으로 내놓는다. 이 클래스들에 `render` 메서드를 다시 넣지 않는다.
- 미니맵은 HUD 라서 구슬과 장애물을 자체적으로 2D 로 그린다(`src/minimap.ts`).

## 원본과 달라진 점

- 빌드가 Parcel 에서 Vite 로 바뀌었다. 아이콘과 `manifest.json` 은 `public/` 에 있고, `assets/` 는 번들에 포함되는 스타일과 이미지다.
- 광고(`adService`, `adRenderer`), 키워드 스프라이트(`keywordService`), 맵 공유마당(`communityMaps`, `mapBrowser`), 분석 스크립트, 서비스워커를 제거했다. `mapSelector.ts` 는 기본 맵만 다루도록 다시 썼다. `StageDef.adBoards` 는 맵 형식 호환을 위해 타입에만 남아 있고 그리지 않는다.
- 원본의 `Marble.render`, `Camera.renderScene`, `SkillEffect.render`, `GameObject` 인터페이스, `RouletteRenderer` 의 엔티티·구슬 그리기는 `Canvas2dWorldRenderer` 로 옮겼다. 스킨 이미지 로딩은 `src/marbleSkins.ts` 로 분리했다. 원본에서 비공개 커스텀 빌드용으로 열어둔 `onBeforeEntities` / `onAfterScene` 훅은 없앴다.
- 결과 팝업의 닫기 버튼 그리기는 `adRenderer` 에서 `src/closeButton.ts` 로 옮겼다.
- `index.html` 의 인라인 스크립트는 원본 구조 그대로이며 `window.roulette`, `window.options`, `window.initMapSelector` 전역을 쓴다. Biome 과 타입 검사가 이 스크립트는 보지 않는다.
- `tsconfig.json` 의 `useDefineForClassFields: false` 는 원본(target es2017)의 클래스 필드 동작을 유지하기 위한 것이다.

## 확정된 방향: 2.5D

**물리는 2D(Box2D) 그대로 두고 렌더만 3D 로 바꾼다.** 이 결정에서 따라 나오는 규칙:

- 물리 코드(`IPhysics`, `Box2dPhysics`)와 맵 데이터 형식(`StageDef`, `MapEntity`)은 원본과 동일하게 유지한다. 맵 형식을 바꾸면 기본 맵과 커뮤니티 맵 호환이 깨진다.
- 추첨 결과가 원본과 달라지면 안 된다. 원본의 `scripts/simulate.ts` 는 `Math.random` 을 시드 고정해 물리만 돌리므로, 같은 조건에서 원본과 출력이 일치하는지가 회귀 기준이다.
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
- **HUD 는 2D 캔버스 그대로**: 순위표, 미니맵, 당첨자 표시, 배속 버튼은 원본의 `UIObject` 코드를 재사용한다. WebGL 결과를 2D 장면 캔버스에 그린 뒤 그 위에 HUD 를 그리고 표시용 캔버스로 복사하는 원본의 합성 구조를 유지한다. 녹화(`VideoRecorder`)가 표시용 캔버스 하나만 찍기 때문이다.
- **구슬은 `InstancedMesh`**: 구슬 1,000개 규모까지 다뤄야 하므로 구슬마다 메시를 만들지 않는다.
- **카메라**: 원본 `Camera` 의 `(x, y, zoom)` 을 계산 결과로 계속 쓰고, 이를 원근 카메라의 위치·거리로 매핑하는 어댑터를 둔다. 추적 로직을 3D 용으로 다시 쓰지 않는다.
- **렌더러 교체 지점**: `RouletteRenderer.createWorldRenderer()` 가 반환하는 구현을 Three.js 것으로 바꾼다. HUD 와 합성 코드는 건드리지 않는다.

## 제약

- **상표**: 원본의 MIT 라이선스는 소스 코드에만 적용된다. "Marble Roulette" / "마블 룰렛" 및 혼동될 수 있는 유사 명칭을 이 프로젝트의 이름·브랜딩(패키지명, 타이틀, manifest, README 제목)에 쓰지 않는다. "based on Marble Roulette by lazygyu" 같은 사실 표기는 허용된다.
- **라이선스 고지**: 원본 코드를 복사해 올 때 원본의 MIT 저작권 고지를 함께 유지한다.
- **원작자 인프라**: 원본은 umami 분석 스크립트, 광고 서버, 맵 공유마당 API(`marblerouletteshop.com`), 서비스워커 kill switch(`scripts/build-sw.js`)에 연결돼 있다. 이 연결들은 가져오지 않는다.
- **git 계정**: 이 저장소는 로컬 설정으로 `kudongku <kudongku@gmail.com>` 을 쓴다(전역 설정과 다르다).
