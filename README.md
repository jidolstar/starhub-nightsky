# Starhub Night Sky

Starhub Night Sky는 Three.js 기반 밤하늘 라이브러리이자 Vue 데모 앱입니다.  
`src/starhub-nightsky`는 Vue나 Pinia에 의존하지 않는 코어 라이브러리이고, `src/app`은 그 라이브러리를 보여주는 데모 UI입니다.

## 실행

```bash
npm install
npm run dev
```

빌드 확인:

```bash
npm run build
```

프로덕션 미리보기:

```bash
npm run preview
```

## 포함 기능

- 밝기에 따라 크기와 할로가 달라지는 별 렌더링
- 방위좌표 격자와 적도좌표 격자 표시
- 지면 표시 on/off
- 동서남북 표시 on/off
- 별자리 선 표시 on/off
- 별자리 이름 표시 on/off
- 국제표준 별자리 경계선 on/off
- 88개 별자리의 한국어 이름과 영문 이름 동시 표기
- 마우스 드래그로 시점 이동
- 마우스 휠로 시야각 조절

## 빠른 시작

```ts
import { StarhubNightsky } from 'starhub-nightsky';

const canvas = document.querySelector('canvas');
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error('Canvas element not found');
}

const nightsky = new StarhubNightsky(canvas, {
  observer: { lat: 37.5665, lon: 126.978 },
  time: new Date(),
  fov: 60,
  layers: {
    equatorialGrid: true,
    landscape: true,
    cardinalDirections: true,
    constellationLines: true,
    constellationLabels: true,
    constellationBoundaries: false,
  },
});

await nightsky.loadDefaultStarCatalog();
nightsky.start();
```

커스텀 CSV를 쓰고 싶다면 직접 불러올 수 있습니다.

```ts
await nightsky.loadStarCatalogFromUrl('/my-stars.csv');
```

별 데이터를 직접 넘길 수도 있습니다.

```ts
nightsky.loadStars(stars);
```

## 공개 API

- `start()`, `stop()`, `dispose()`
- `setObserver()`, `setLocation()`, `setTime()`, `setFov()`
- `loadDefaultStarCatalog()`
- `loadStarCatalogFromUrl()`
- `loadStars()`, `loadMockStars()`
- `setLayerVisibility()`
- `setAzimuthalGridVisible()`, `setEquatorialGridVisible()`
- `setLandscapeVisible()`, `setCardinalDirectionsVisible()`
- `setConstellationLinesVisible()`, `setConstellationLabelsVisible()`
- `setConstellationBoundariesVisible()`
- `setConstellationsVisible()` - 별자리 선, 이름, 경계선을 한 번에 표시합니다.

## 프로젝트 구조

- `src/starhub-nightsky/`: 라이브러리 코어
- `src/app/`: Vue 데모와 store
- `src/starhub-nightsky/data/bsc5p.csv`: 라이브러리에 포함된 기본 별 카탈로그
- `src/starhub-nightsky/data/ConstellationBoundaries.ts`: IAU 공식 별자리 경계 데이터
- `public/`: 정적 자산 전용

## 외부 라이브러리

### 런타임

| 이름 | 용도 | 라이선스 |
| --- | --- | --- |
| `three` | Three.js 기반 렌더링 | MIT |
| `astronomy-engine` | 적경/적위 계산 및 방위각/고도 변환 | MIT |
| `vue` | 데모 UI | MIT |
| `pinia` | 데모 상태 관리 | MIT |

### 빌드/개발

| 이름 | 용도 | 라이선스 |
| --- | --- | --- |
| `vite` | 개발 서버 및 번들링 | MIT |
| `@vitejs/plugin-vue` | Vue SFC 플러그인 | MIT |
| `@vue/tsconfig` | Vue/TypeScript 기본 설정 | MIT |
| `vue-tsc` | Vue 타입 검사 | MIT |
| `typescript` | TypeScript 컴파일러 | Apache-2.0 |
| `@types/node` | Node.js 타입 정의 | MIT |
| `@types/three` | Three.js 타입 정의 | MIT |

## 외부 자원

| 자원 | 용도 | 비고 |
| --- | --- | --- |
| `src/starhub-nightsky/data/bsc5p.csv` | 기본 별 카탈로그 | NASA HEASARC Bright Star Catalog(BSC5P) 기반, 내부 번들 자산 |
| `src/starhub-nightsky/data/Constellations.ts` | 별자리 선과 라벨 데이터 | d3-celestial GeoJSON 기반, 상세 고지는 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) 참조 |
| `src/starhub-nightsky/data/ConstellationBoundaries.ts` | IAU 공식 별자리 경계 데이터 | IAU 공식 boundary TXT 기반, 상세 고지는 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) 참조 |
| 한국천문연구원 천문학습관 | 88개 별자리 한글 표기 기준 | 별자리 이름 정리 기준 자료 |

경계선 원본은 IAU의 [The Constellations](https://www.iau.org/IAU/Iau/Science/What-we-do/The-Constellations.aspx) 페이지와 아카이브 TXT를 기준으로 했습니다.

자세한 외부 자료 고지와 라이선스 원문은 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)에 있습니다.
