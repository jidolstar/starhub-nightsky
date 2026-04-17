# 별지도 배경 레이어(SkymapLayer) 구현 및 타일 생성 계획

`_original_images/starmap`에 있는 EXR 파일을 해석하여 웹 기반 타일 이미지로 변환하고, 이를 별지도(`StarhubNightsky`)의 천구 배경 레이어로 추가하는 작업을 수행한다.

## 사용자 검토 필요 사항
> [!IMPORTANT]
> 1. **의존성 추가**: EXR 파일을 처리하기 위해 `sharp` 라이브러리 설치가 필요하다.
> 2. **타일 규격**: 현재 4K 소스를 바탕으로 Level 1(2개 타일)을 생성하며, 각 타일은 512x512 WebP 형식을 사용한다.
> 3. **렌더링 방식**: 천구 배경을 위해 커다란 구체(Sphere)를 적도 좌표계에 고정하여 렌더링한다.

## 제안된 변경 사항

### 1. 도구 제작 (Tools)
EXR 파일을 WebP 타일로 변환하는 자동화 스크립트를 작성한다.

#### [NEW] [generate-tiles.mjs](file:///d:/starhub-nightsky/tools/generate-tiles.mjs)
- `sharp` 라이브러리를 사용하여 `starmap_random_2020_4k.exr`을 로드한다.
- 이미지를 절반으로 나누어(RA 0~12h, 12~24h) 각각 512x512 사이즈로 리사이징한다.
- `public/assets/skymap/skymap1_001.webp`, `skymap1_002.webp`로 저장한다.

### 2. 별지도 라이브러리 (Library - Core)
생성된 자원을 렌더링하는 새로운 레이어를 추가한다.

#### [NEW] [SkymapLayer.ts](file:///d:/starhub-nightsky/src/starhub-nightsky/layers/SkymapLayer.ts)
- `Three.js`의 `SphereGeometry`를 사용하여 거대한 구체를 생성한다.
- 적도 좌표계(J2000) 기준으로 회전을 설정한다 (천구 고정).
- 생성된 2개의 WebP 타일을 각각 구체의 좌/우 반구에 텍스처로 매핑한다.
- 사용자 정의 투명도(Opacity) 및 가시성 제어 기능을 포함한다.

#### [MODIFY] [StarhubNightsky.ts](file:///d:/starhub-nightsky/src/starhub-nightsky/StarhubNightsky.ts)
- `SkymapLayer`를 기본 레이어로 등록하는 코드를 추가한다.

### 3. 리소스 생성 (Assets)
`tools/generate-tiles.mjs`를 실행하여 실제 이미지를 생성한다.
- 저장 위치: `public/assets/skymap/`

---

## 오픈 질문
> [!NOTE]
> - **미래 확장성**: 현재는 Level 1(2개)만 생성하지만, 추후 Level 2(4개), 3(8개) 등으로 확대할 때 타일링 방식(예: Quadtree, Equirectangular 등)을 어떻게 가져갈지 결정이 필요하다. (현재는 단순 분할 방식 선호).

## 검증 계획

### 자동화 테스트/스크립트
- `npm run generate-tiles` (스크립트 등록 후) 실행 시 `public` 폴더에 이미지가 정상 생성되는지 확인한다.

### 수동 검증
- 브라우저를 통해 별지도 배경에 은하수/별 배경이 정상적으로 출력되는지 확인한다.
- 적도 좌표계와 일치하는지(북극성, 태양 경로 등과 대조) 확인한다.
- 줌 인/아웃 시 텍스처 깨짐이나 이음새(Seam) 문제가 없는지 확인한다.
