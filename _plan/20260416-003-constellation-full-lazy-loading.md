# 별자리 데이터 완전 분리 및 지연 로딩(Lazy Loading) 고도화 계획

별자리 정보(이름), 별자리선, 별자리 경계선 데이터를 각각 독립된 CSV 파일로 관리하고, 사용자가 필요한 레이어를 활성화하는 시점에만 해당 리소스를 개별적으로 로드하도록 구조를 전면 개편합니다.

## 제안된 변경 사항

### 1. 데이터 외부화 및 파일 분리
- **[NEW] constellation-boundaries.csv**: `src/starhub-nightsky/data/ConstellationBoundaries.ts`에 하드코딩된 대용량 데이터를 CSV로 추출합니다.
- **[MODIFY] ConstellationBoundaries.ts**: 하드코딩된 데이터를 제거하고 타입 정의만 남깁니다.
- **[MODIFY] Constellations.ts**: 별자리 정의에서 `lines`와 `boundaries`를 선택적(Optional) 필드로 변경하거나 로딩 시점에 동적으로 주입하도록 인터페이스를 조정합니다.

### 2. 로딩 엔진 고도화 (ConstellationCatalog.ts)
- **개별 로더 구현**:
    - `loadBundledConstellationCatalogCsvText()`: 별자리 약자 및 이름 로드.
    - `loadBundledConstellationLinesCsvText()`: 선 좌표 로드.
    - `loadBundledConstellationBoundariesCsvText()`: 경계선 좌표 로드.
- **개별 파서 구현**:
    - `parseConstellationCatalogCsv()`
    - `parseConstellationLinesCsv()`
    - `parseConstellationBoundariesCsv()`

### 3. 메인 클래스 제어 로직 개편 (StarhubNightsky.ts)
- **독립적인 Promise 캐싱**:
    - `catalogPromise`: 별자리 기본 정보
    - `linesPromise`: 별자리선 데이터
    - `boundariesPromise`: 별자리 경계선 데이터
- **세분화된 트리거**:
    - `setConstellationLinesVisible(true)` -> `Catalog` + `Lines` 로드 트리거.
    - `setConstellationLabelsVisible(true)` -> `Catalog` 로드 트리거.
    - `setConstellationBoundariesVisible(true)` -> `Catalog` + `Boundaries` 로드 트리거.

### 4. 렌더링 레이어 연동
- [ConstellationBoundaryLayer](file:///d:/starhub-nightsky/src/starhub-nightsky/layers/ConstellationBoundaryLayer.ts)가 비동기로 로드된 데이터를 받아 지오메트리를 갱신할 수 있도록 `setBoundaries()` 메서드를 추가하거나 보강합니다.

## 오픈 질문
- 별자리 경계선의 경우 7,000라인에 가까운 대용량인데, CSV 압축(Gzip 등) 설정을 서버/빌드 단계에서 권장합니다.

## 검증 계획
1. Network 탭에서 각 체크박스를 켤 때마다 해당하는 CSV만 fetch 되는지 확인.
2. 이미 로드된 리소스는 다시 켤 때 fetch가 발생하지 않는지 확인.
3. 경계선 표시 시 지오메트리가 정상적으로 빌드되는지 확인.
