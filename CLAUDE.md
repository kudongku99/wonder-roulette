# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트

구슬을 떨어뜨려 추첨하는 2D 게임 [lazygyu/roulette](https://github.com/lazygyu/roulette) 을 3D 로 리팩터링하는 프로젝트다. 원본 소스는 `../roulette/` 에 클론돼 있으며 **참조 전용이고 수정하지 않는다.** 원본 구조에 대한 상세 설명은 `../CLAUDE.md` 에 있다.

현재 상태: 5단계(비주얼)까지 끝났다. 6단계부터는 원본과의 기능 동등성을 내려놓고 3D 전용 추첨 게임으로 다시 짠다(기능 제거 → HTML HUD → 화면 흐름 → 로비 → 맵 시각·환경설정 → 성능·배포). 단계별 계획과 바뀐 결정은 `docs/roadmap.md` 에 있다. 아래 설명 중 2D 렌더러, 캔버스 HUD, 녹화, 테마, 스킬에 관한 부분은 6·7단계에서 없어질 현재 코드의 모습이다.

## 명령어

패키지 매니저는 pnpm 이다.

```shell
pnpm install
pnpm dev                 # Vite 개발 서버, http://localhost:1236 (?renderer=2d 를 붙이면 2D 로 그린다)
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

- `WorldRenderer`(`src/render/worldRenderer.ts`)가 월드(배경, 장애물, 이펙트, 구슬)를 그리는 인터페이스다. `render(target, frame)` 은 2D 캔버스 컨텍스트를 받아 그 캔버스 전체를 채운다.
- 합성 경로는 렌더러의 `rendersAtDisplayResolution` 에 따라 둘이다. `false`(2D)면 원본과 같이 절반 해상도의 장면 캔버스에 월드와 HUD 를 함께 그려 표시용 캔버스로 확대한다. `true`(3D)면 월드를 표시용 캔버스에 표시 해상도로 직접 그리고, 장면 캔버스는 HUD 만 담은 투명한 층이 되어 그 위에 확대돼 올라간다. 어느 쪽이든 최종 화면은 표시용 캔버스 하나라 녹화 코드는 같다.
- `frame.viewSize` 는 장면 캔버스 크기이고 보이는 월드 범위의 기준이다. `target` 캔버스가 이보다 크면 같은 범위를 더 높은 해상도로 그린다는 뜻이다.
- `WorldFrame` 이 한 프레임의 입력이다. 물리 좌표 그대로의 카메라 `(x, y, zoom)`, 엔티티 상태, 구슬, 스킬 이펙트, 골인 축하 효과(`GoalBurst`), 테마, 당첨 강조 범위, 스킨 조회 함수를 담는다.
- 구현은 둘이다. 기본은 `ThreeWorldRenderer`(`src/render/three/`), 주소에 `?renderer=2d` 가 있거나 WebGL 렌더러 생성이 실패하면 `Canvas2dWorldRenderer` 다. 고르는 곳은 `RouletteRenderer.createWorldRenderer()` 다.
- 새 그리기 요소를 넣을 때는 `WorldFrame` 에 필요한 값을 싣는다. 2D 구현은 원본 화면의 기준이라 원본에 있던 것을 빼지 않고, 원본에 없던 3D 전용 연출은 넣지 않는다. 골인 축하 효과가 그 예로, 3D 는 `frame.bursts` 를 월드 안의 종이 조각으로 그리고(`drawsGoalBursts`), 2D 는 원본의 HUD 화면 파티클(`ParticleManager`)을 그대로 쓴다.
- `RouletteRenderer` 는 캔버스 생성·리사이즈, 월드 렌더러 호출, 그 위의 HUD(`UIObject[]`, 파티클, 당첨자 표시), 표시용 캔버스 복사를 맡는다.
- `Marble`, `Camera`, `SkillEffect` 는 그리기 코드가 없는 상태 객체다. 그릴 때 필요한 값은 `marble.coolTimeRatio`, `effect.progress` 같은 읽기 전용 값으로 내놓는다. 이 클래스들에 `render` 메서드를 다시 넣지 않는다.
- 미니맵은 HUD 라서 구슬과 장애물을 자체적으로 2D 로 그린다(`src/minimap.ts`).

### 3D 렌더러

- `ThreeWorldRenderer` 는 화면에 붙지 않은 자체 WebGL 캔버스에 그린 뒤 `target.drawImage` 로 표시용 캔버스에 옮긴다. 같은 태스크 안에서 바로 복사하므로 `preserveDrawingBuffer` 가 필요 없다.
- 좌표 변환은 두 곳뿐이다. `_world` 그룹의 `scale.y = -1` 과 `applyView2d`(`cameraRig.ts`). 그 아래에 붙는 메시(`StageMeshes`, `MarbleMeshes`)는 물리 좌표와 물리 각도를 그대로 쓴다. 메시 코드에서 y 나 각도의 부호를 따로 뒤집지 않는다.
- `applyView2d` 는 2D 카메라의 `(x, y, zoom)` 을 원근 카메라 거리로 바꾼다. z = 0 평면에서 보이는 세로 범위가 2D 와 같아지게 해서 미니맵의 뷰포트 표시와 카메라 추적 로직이 그대로 맞는다. `CAMERA_TILT` 만큼 위에서 내려다보고, 결승 연출로 2D 줌이 1 을 넘으면 `finishAngle` 이 줌에 비례해 더 기울이고 좌우로 천천히 돈다. 연출 판정 자체는 2D 카메라의 줌 값을 읽을 뿐 따로 하지 않는다.
- `StageMeshes.sync` 는 엔티티의 `shape` 객체 동일성으로 메시를 대응시킨다. `physics.getEntities()` 가 매 프레임 새 객체를 돌려주지만 `shape` 는 맵 데이터의 객체 그대로이기 때문이다. polyline 은 선분마다 얇은 박스를 만들어 하나로 합친다.
- 스킨 없는 구슬은 `InstancedMesh` 하나이고, 구슬 수가 용량을 넘으면 두 배씩 키워 새로 만든다. 스킨이 있는 구슬은 수가 적으므로 구슬마다 메시를 따로 두고, 앞에서 본 모습대로 이미지가 입혀지는 UV 를 쓴다.
- 화면에서 크기가 일정해야 하는 표시(구슬 이름, 당첨 테두리, 쿨타임 호)는 3D 로 만들지 않고 `drawMarbleOverlay` 가 WebGL 결과를 복사한 뒤 그 위에 2D 로 그린다. 구슬 중심과 반지름을 카메라로 투영해 위치를 잡는다.
- 스킬 이펙트는 구슬 평면 위의 고리 메시(`EffectMeshes`)다.
- 조명은 방향광 하나(그림자 포함), 약한 주변광, `RoomEnvironment` 환경광이다. 그림자를 받는 배경판과 그림자 카메라 범위는 매 프레임 `followView` 가 보이는 곳으로 옮긴다.
- 테마의 `bloomRadius` 가 0 보다 크면(다크) 빛나는 테마로 본다. 장애물 재질에 자체 발광을 넣고 `EffectComposer` 로 블룸을 건다. 아니면(라이트) 후처리 없이 바로 그린다. 밝기 값들은 화면을 보며 맞춘 것이라, 바꿀 때는 두 테마 모두 화면으로 확인한다.
- 골인 축하 효과(`ConfettiMeshes`)는 시드와 경과 시간만으로 조각 위치를 계산해 프레임 사이 상태가 없다.
- 디버그 그림은 `DebugPlane` 이 2D 캔버스에 한 번 그려 장애물 뒤쪽 평면의 텍스처로 쓴다. `WorldDebugDraw` 는 월드 좌표로 그리는 2D 함수 그대로다.
- WebGL 이 필요한 `ThreeWorldRenderer` 자체는 테스트하지 않는다. GL 없이 돌아가는 `cameraRig`, `StageMeshes`, `MarbleMeshes`, `EffectMeshes`, `ConfettiMeshes`, `drawMarbleOverlay` 를 단위 테스트한다. `DebugPlane` 은 DOM 캔버스가 필요해 테스트가 없다. 화면은 개발 서버에서 직접 확인한다.

## 원본과 달라진 점

- 빌드가 Parcel 에서 Vite 로 바뀌었다. 아이콘과 `manifest.json` 은 `public/` 에 있고, `assets/` 는 번들에 포함되는 스타일과 이미지다.
- 광고(`adService`, `adRenderer`), 키워드 스프라이트(`keywordService`), 맵 공유마당(`communityMaps`, `mapBrowser`), 분석 스크립트, 서비스워커를 제거했다. `mapSelector.ts` 는 기본 맵과 파일에서 불러온 맵만 다루도록 다시 썼다. 맵 파일의 형태 검증(`src/stageFile.ts`)은 원본 `communityMaps.ts` 에서 가져왔고, 불러온 맵은 저장하지 않아 새로 고치면 사라진다. `StageDef.adBoards` 는 맵 형식 호환을 위해 타입에만 남아 있고 그리지 않는다.
- 원본의 `Marble.render`, `Camera.renderScene`, `SkillEffect.render`, `GameObject` 인터페이스, `RouletteRenderer` 의 엔티티·구슬 그리기는 `Canvas2dWorldRenderer` 로 옮겼다. 스킨 이미지 로딩은 `src/marbleSkins.ts` 로 분리했다. 원본에서 비공개 커스텀 빌드용으로 열어둔 `onBeforeEntities` / `onAfterScene` 훅은 없앴다.
- 결과 팝업의 닫기 버튼 그리기는 `adRenderer` 에서 `src/closeButton.ts` 로 옮겼다.
- `index.html` 의 인라인 스크립트는 원본 구조 그대로이며 `window.roulette`, `window.options`, `window.initMapSelector` 전역을 쓴다. Biome 과 타입 검사가 이 스크립트는 보지 않는다.
- `tsconfig.json` 의 `useDefineForClassFields: false` 는 원본(target es2017)의 클래스 필드 동작을 유지하기 위한 것이다.

## 확정된 방향: 2.5D

**물리는 2D(Box2D) 그대로 두고 렌더만 3D 로 바꾼다.** 이 결정에서 따라 나오는 규칙:

- 물리 코드(`IPhysics`, `Box2dPhysics`)와 맵 데이터 형식(`StageDef`, `MapEntity`)은 원본과 동일하게 유지한다. 맵 형식을 바꾸면 기본 맵과 커뮤니티 맵 호환이 깨진다.
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
- **HUD 는 HTML/CSS 로 옮긴다**: 지금은 원본의 `UIObject` 코드로 2D 캔버스에 그리고 WebGL 결과와 합성한다. 이 구조는 녹화가 표시용 캔버스 하나만 찍기 때문에 있었고, 녹화를 없애므로 7단계에서 WebGL 캔버스 하나 + HTML HUD 로 바꾼다. 캔버스 HUD 에 새 기능을 더하지 않는다.
- **구슬은 `InstancedMesh`**: 구슬마다 메시를 만들지 않는다. 구슬 수 상한은 총 100개다.
- **카메라**: 원본 `Camera` 의 `(x, y, zoom)` 을 계산 결과로 계속 쓰고, 이를 원근 카메라의 위치·거리로 매핑하는 어댑터를 둔다. 추적 로직을 3D 용으로 다시 쓰지 않는다.

## 제약

- **상표**: 원본의 MIT 라이선스는 소스 코드에만 적용된다. "Marble Roulette" / "마블 룰렛" 및 혼동될 수 있는 유사 명칭을 이 프로젝트의 이름·브랜딩(패키지명, 타이틀, manifest, README 제목)에 쓰지 않는다. "based on Marble Roulette by lazygyu" 같은 사실 표기는 허용된다.
- **라이선스 고지**: 원본 코드를 복사해 올 때 원본의 MIT 저작권 고지를 함께 유지한다.
- **원작자 인프라**: 원본은 umami 분석 스크립트, 광고 서버, 맵 공유마당 API(`marblerouletteshop.com`), 서비스워커 kill switch(`scripts/build-sw.js`)에 연결돼 있다. 이 연결들은 가져오지 않는다.
- **git 계정**: 이 저장소는 로컬 설정으로 `kudongku <kudongku@gmail.com>` 을 쓴다(전역 설정과 다르다).
