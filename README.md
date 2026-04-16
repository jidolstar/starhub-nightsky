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

## 주요 기능 및 특징

- **고성능 천체 렌더링**: 밝기에 따라 크기와 할로가 달라지는 별 렌더링
- **지연 로딩(Lazy Loading)**: 별자리선, 이름, 경계선 데이터를 필요한 시점에만 동적으로 로드하여 초기 번들 크기 최소화
- **부드러운 전환 효과**: 레이어 켜기/끄기 시 부드러운 페이드 인/아웃 애니메이션 적용
- **최적화된 라벨링**: 별자리 이름(Labels)의 불필요한 재생성을 방지하여 깜빡임 없는 사용자 경험 제공
- **IAU 공식 데이터**: 88개 별자리의 한국어/영문 이름, 공식 경계선 및 구성 선 데이터 포함
- **자유로운 시점 제어**: 마우스 드래그 이동 및 휠 시야각 조절 (FOV 10° ~ 185°)

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
  assetPath: '/assets/data/', // 정적 자산(CSV) 경로 설정
  layers: {
    equatorialGrid: true,
    landscape: true,
    cardinalDirections: true,
    constellationLines: true,
    constellationLabels: true,
    constellationBoundaries: false,
  },
});

// 별 데이터를 로드하여 화면에 표시합니다 (Lazy Loading)
await nightsky.loadDefaultStarCatalog();
nightsky.start();
```

## 설정 옵션 (StarhubNightskyOptions)

| 옵션명 | 타입 | 설명 | 기본값 |
| --- | --- | --- | --- |
| `observer` | `ObserverLocation` | 관측자의 위도와 경도 | 서울 (37.5, 126.9) |
| `time` | `Date` | 관측 시간 | 현재 시간 |
| `fov` | `number` | 초기 카메라 시야각 (Degree) | 60 |
| `assetPath` | `string` | CSV 데이터 파일이 위치한 베이스 경로 | `/assets/data/` |
| `layers` | `Partial<LayerVisibilityOptions>` | 초기 레이어 표시 설정 | - |
| `pixelRatio` | `number` | 렌더러의 픽셀 배율 | `window.devicePixelRatio` |

## 공개 API

- `start()`, `stop()`, `dispose()`
- `setObserver()`, `setLocation()`, `setTime()`, `setFov()`
- `loadDefaultStarCatalog()` - `assetPath`에서 기본 별 데이터를 로드합니다.
- `setLayerVisibility()` - 여러 레이어의 표시 상태를 한 번에 갱신합니다. (페이드 효과 적용)
- `setConstellationLinesVisible()`, `setConstellationLabelsVisible()`
- `setConstellationBoundariesVisible()`
- `setConstellationsVisible()` - 별자리 관련 모든 레이어를 한 번에 제어합니다.

## 프로젝트 구조

- `src/starhub-nightsky/`: 라이브러리 코어 (Vanilla JS/TS 기반)
- `src/app/`: Vue 3 데모 앱 및 상태 관리
- `public/assets/data/`: 라이브러리 구동에 필요한 정적 데이터 (CSV)
  - `star-catalog.csv`: 기본 별 데이터 (BSC5)
  - `constellation-catalog.csv`: 별자리 메타데이터
  - `constellation-lines.csv`: 별자리 구성 선 데이터
  - `constellation-boundaries.csv`: IAU 공식 별자리 경계선 데이터

## 외부 라이브러리 및 자원

본 프로젝트는 다음과 같은 데이터와 라이브러리를 활용합니다:
- **Three.js**: WebGL 기반 3D 렌더링 엔진
- **Astronomy-Engine**: 정밀한 천체 위치 계산
- **Bright Star Catalog (BSC5P)**: NASA HEASARC 기반 별 데이터
- **d3-celestial**: 별자리 구성 데이터의 기초 자료
- **IAU Constellations**: 공식 별자리 경계 데이터 기준

상세한 라이선스 고지 및 소스는 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)를 참조하십시오.
