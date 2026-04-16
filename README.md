# Starhub Nightsky

Starhub Nightsky는 웹 브라우저에서 구동되는 고성능 천체 렌더링 엔진 및 라이브러리입니다. Three.js를 기반으로 하며, 실제 천체 데이터를 바탕으로 별, 별자리, 격자 등을 실시간으로 시뮬레이션하고 렌더링합니다.

## ✨ 주요 특징 (Features)

- **정밀한 천체 시뮬레이션**: 관측지의 위도, 경도 및 실시간 시간에 따른 천체 위치(RA/Dec to Az/Alt)를 정밀하게 계산합니다.
- **지연 로딩 아키텍처 (Lazy Loading)**: 대용량 별자리 및 경계선 데이터를 각 레이어가 필요할 때 로드하여 초기 구동 속도를 최적화했습니다.
- **부드러운 시각적 효과**: 모든 레이어(별자리, 격자, 방위 표시 등)에 부드러운 **Fade In/Out 애니메이션**이 적용되어 고급스러운 UX를 제공합니다.
- **프리미엄 격자 시스템**: 스텔라리움(Stellarium) 스타일의 화사한 색상과 최적화된 셰이더를 사용하여 지평/적도 좌표계를 아름답게 표시합니다.
- **반응형 오버레이**: WebGL 캔버스 위에 HTML 기반의 별자리 이름 및 방위 표시를 결합하여 가독성과 성능을 동시에 확보했습니다.
- **스테레오그래픽 투영**: 광시야각에서도 왜곡을 최소화하는 평사 투영(Stereographic Projection)을 지원합니다.

## 🏗️ 아키텍처 (Architecture)

### Core Engine
- `SkyRenderer`: Three.js 씬(Scene)을 관리하고 모든 레이어의 업데이트 루프를 지휘하는 중앙 엔진입니다.
- `CelestialMath`: 천체 좌표 변환 및 시간 계산을 담당하는 순수 수학 모듈입니다.

### Data Layer
- `StarCatalogManager`: 9,000개 이상의 실별 데이터를 관리합니다.
- `ConstellationCatalog/Lines/Boundaries`: 별자리 관련 정지 데이터를 레이어 요구에 맞춰 제공합니다.

### Layers
- `StarLayer`: 별의 밝기와 색상을 렌더링합니다.
- `ConstellationLayer`: 별자리 선과 이름을 페이드 애니메이션과 함께 표시합니다.
- `GridLayer`: 지평/적도 격자를 셰이더 기반 투명도 제어로 표현합니다.
- `CardinalDirectionLayer`: 동서남북 방위를 DOM 오버레이로 구현합니다.

## 🚀 시작하기 (Getting Started)

### 설치
```bash
npm install starhub-nightsky
```

### 기본 사용법
```typescript
import { StarhubNightsky } from 'starhub-nightsky';

const container = document.getElementById('sky-container');
const nightsky = new StarhubNightsky(container);

// 지평 격자 켜기
nightsky.setAzimuthalGridVisible(true);

// 관측지 설정 (위도, 경도)
nightsky.observer.setLocation(37.5665, 126.9780);
```

## 🎨 기술적 세부 사항 (Tech Stack)

- **Rendering**: Three.js (WebGL)
- **Calculations**: Custom Celestial Math Engine
- **Data Format**: Optimized Atomized TS Data
- **Styling**: Vanilla CSS for Overlays

## 📄 라이선스 (License)

이 프로젝트는 MIT 라이선스를 따릅니다.
