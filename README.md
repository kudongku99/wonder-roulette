# roulette-3d

구슬을 떨어뜨려 당첨자를 뽑는 추첨 게임의 3D 버전입니다.

[Marble Roulette by lazygyu](https://github.com/lazygyu/roulette) 의 소스 코드를 기반으로 하며, 원본의 2D 캔버스 렌더링을 3D 로 바꾸는 리팩터링 프로젝트입니다. 원작자와는 관련이 없는 개인 프로젝트입니다.

## 현재 상태

장애물과 구슬이 3D 로 그려지는 단계입니다. 추첨은 처음부터 끝까지 동작하지만, 구슬 이름 표시와 스킬 이펙트 같은 일부 요소는 아직 3D 화면에 없습니다. 주소에 `?renderer=2d` 를 붙이면 원본과 같은 2D 화면으로 볼 수 있습니다. 진행 상황은 [docs/roadmap.md](docs/roadmap.md) 를 참고해 주세요.

## 실행

```shell
pnpm install
pnpm dev
```

개발 서버는 http://localhost:1236 에서 열립니다.

```shell
pnpm build      # 프로덕션 빌드
pnpm test       # 테스트
pnpm lint       # 린트와 포맷
```

## 접근 방식

물리 시뮬레이션은 원본과 같은 2D(Box2D) 를 그대로 쓰고, 화면 표현만 3D 로 바꾸는 2.5D 방식입니다.

- 원본의 맵 데이터를 수정 없이 그대로 사용할 수 있습니다.
- 물리를 건드리지 않으므로 같은 조건에서 추첨 결과가 원본과 같습니다.
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

"Marble Roulette"™ 및 "마블 룰렛"™ 은 lazygyu 의 상표이며, 이 프로젝트는 해당 명칭을 프로젝트명이나 브랜딩으로 사용하지 않습니다.
