# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트

구슬을 떨어뜨려 추첨하는 2D 게임 [lazygyu/roulette](https://github.com/lazygyu/roulette) 을 3D 로 리팩터링하는 프로젝트다. 원본 소스는 `../roulette/` 에 클론돼 있으며 **참조 전용이고 수정하지 않는다.** 원본 구조에 대한 상세 설명은 `../CLAUDE.md` 에 있다.

현재 상태: 문서만 있고 코드는 아직 없다. 단계별 계획과 진행 상황은 `docs/roadmap.md` 가 기준이며, 단계를 끝내면 그 문서의 체크박스를 갱신한다. 빌드·린트·테스트 명령은 1단계(스캐폴딩)에서 정해지므로 그때 이 파일에 추가한다.

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
| 린트·포맷 | Biome (원본 설정 유지: 2칸 스페이스, 작은따옴표, 세미콜론, 줄 폭 120) |

## 설계 원칙

- **좌표계**: 물리 월드는 y 가 아래로 증가한다(중력 `(0, 10)`). Three.js 는 y 가 위다. 변환은 3D 렌더 계층 한 곳에서만 하고, 게임 로직에는 물리 좌표만 흐르게 한다.
- **HUD 는 2D 캔버스 그대로**: 순위표, 미니맵, 당첨자 표시, 배속 버튼은 원본의 `UIObject` 코드를 재사용한다. WebGL 결과를 2D 장면 캔버스에 그린 뒤 그 위에 HUD 를 그리고 표시용 캔버스로 복사하는 원본의 합성 구조를 유지한다. 녹화(`VideoRecorder`)가 표시용 캔버스 하나만 찍기 때문이다.
- **구슬은 `InstancedMesh`**: 구슬 1,000개 규모까지 다뤄야 하므로 구슬마다 메시를 만들지 않는다.
- **카메라**: 원본 `Camera` 의 `(x, y, zoom)` 을 계산 결과로 계속 쓰고, 이를 원근 카메라의 위치·거리로 매핑하는 어댑터를 둔다. 추적 로직을 3D 용으로 다시 쓰지 않는다.
- **렌더러 교체 지점**: 원본 `Roulette.createRenderer()` 팩토리 훅이 렌더러를 바꿔 끼우는 자리다. 월드 그리기와 HUD 그리기를 분리한 뒤 월드 쪽만 Three.js 구현으로 대체한다.

## 제약

- **상표**: 원본의 MIT 라이선스는 소스 코드에만 적용된다. "Marble Roulette" / "마블 룰렛" 및 혼동될 수 있는 유사 명칭을 이 프로젝트의 이름·브랜딩(패키지명, 타이틀, manifest, README 제목)에 쓰지 않는다. "based on Marble Roulette by lazygyu" 같은 사실 표기는 허용된다.
- **라이선스 고지**: 원본 코드를 복사해 올 때 원본의 MIT 저작권 고지를 함께 유지한다.
- **원작자 인프라**: 원본은 umami 분석 스크립트, 광고 서버, 맵 공유마당 API(`marblerouletteshop.com`), 서비스워커 kill switch(`scripts/build-sw.js`)에 연결돼 있다. 이 연결들은 가져오지 않는다.
- **git 계정**: 이 저장소는 로컬 설정으로 `kudongku <kudongku@gmail.com>` 을 쓴다(전역 설정과 다르다).
