# Starhub Night Sky

Three.js와 Vue 3로 만든 별지도 뷰어입니다. 앱은 데모 UI이고, 별지도 렌더링과 천문 계산은 `src/starhub-nightsky` 라이브러리 경계 안에 캡슐화되어 있습니다.

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

## 주요 기능

- 관측 위치와 시간에 따른 실제 별 위치 렌더링
- Bright Star Catalog 기반 별 데이터 로딩
- 밝기별 별 크기와 할로 표현
- 방위 좌표계/적도 좌표계 그리드 표시
- 지평선 실루엣 표시
- 정북/정동/정남/정서 방향 점과 글자 표시
- 88개 별자리 선 표시
- 별자리 이름 표시: 한국어 이름과 작은 영어 이름을 함께 표기
- 마우스 드래그로 시점 이동, 휠로 확대/축소

## 데모 조작

- `FOV (Zoom)`: 시야각 조절
- `Latitude`: 관측 위도 조절
- `Show Azimuthal Grid`: 방위 좌표계 그리드 켜기/끄기
- `Show Equatorial Grid`: 적도 좌표계 그리드 켜기/끄기
- `Show Landscape`: 지평선 실루엣 켜기/끄기
- `Show Cardinal Directions`: 동서남북 표시 켜기/끄기
- `Show Constellation Lines`: 별자리 선 켜기/끄기
- `Show Constellation Labels`: 별자리 이름 켜기/끄기
- `+1 Hour`, `+1 Day`, `+1 Month`: 관측 시간 이동

## 라이브러리 사용

외부 앱에서는 대표 클래스인 `StarhubNightsky`만 가져와 사용합니다.

```ts
import { StarhubNightsky } from './starhub-nightsky';

const nightsky = new StarhubNightsky(canvas, {
  observer: { lat: 37.5665, lon: 126.978 },
  time: new Date(),
  fov: 60,
  layers: {
    equatorialGrid: true,
    constellationLines: true,
    constellationLabels: true,
  },
});

await nightsky.loadDefaultStarCatalog();
nightsky.start();
```

레이어는 개별 API나 `setLayerVisibility`로 제어할 수 있습니다.

```ts
nightsky.setConstellationLinesVisible(false);
nightsky.setConstellationLabelsVisible(true);
nightsky.setLayerVisibility({
  cardinalDirections: true,
  constellationLines: true,
  constellationLabels: true,
});
```

## 구조

- `src/starhub-nightsky/StarhubNightsky.ts`: 외부에서 사용하는 대표 클래스
- `src/starhub-nightsky/engine/SkyRenderer.ts`: Three.js scene, camera, render loop 관리
- `src/starhub-nightsky/layers/StarLayer.ts`: 별 점, 밝기, 할로 렌더링
- `src/starhub-nightsky/layers/GridLayer.ts`: 방위/적도 좌표계 그리드 렌더링
- `src/starhub-nightsky/layers/LandscapeLayer.ts`: 지평선 실루엣 렌더링
- `src/starhub-nightsky/layers/CardinalDirectionLayer.ts`: 동서남북 방향 점과 글자 표시
- `src/starhub-nightsky/layers/ConstellationLayer.ts`: 별자리 선과 회전하지 않는 별자리명 표시
- `src/starhub-nightsky/math/CelestialMath.ts`: 적경/적위를 방위각/고도로 변환
- `src/starhub-nightsky/catalog/StarCatalog.ts`: Bright Star Catalog CSV 파싱
- `src/starhub-nightsky/data/Constellations.ts`: 88개 별자리 선과 라벨 좌표 데이터
- `src/app/`: Vue 데모 앱, Pinia store, UI adapter

`src/starhub-nightsky`는 Vue와 Pinia에 의존하지 않습니다. Vue 앱은 `StarhubNightsky` public API를 호출하는 얇은 어댑터 역할만 합니다.

## 데이터

- 별 데이터는 NASA HEASARC Bright Star Catalog(BSC5P)를 CSV로 변환해 `src/starhub-nightsky/data/bsc5p.csv`로 포함합니다.
- 별자리 선과 라벨 좌표는 d3-celestial의 GeoJSON 데이터를 내부 포맷으로 변환한 것입니다.
- 별자리 한국어 이름은 한국천문연구원의 88개 별자리 체계에 맞춘 이름을 사용합니다.
- d3-celestial 데이터 사용 고지는 `THIRD_PARTY_NOTICES.md`에 정리되어 있습니다.

## 기술 스택

- Vue 3
- TypeScript
- Pinia
- Three.js
- astronomy-engine
