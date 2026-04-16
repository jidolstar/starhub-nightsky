# 별자리선 데이터 외부화 및 동적 로딩 구현 계획

별자리선(Constellation Lines) 데이터를 `Constellations.ts` 파일에서 제거하고, 외부 CSV 파일(`constellation-lines.csv`)로 분리하여 앱 실행 시점에 동적으로 로드하도록 구현한다.

## 제안된 변경 사항

### 1. 데이터 저장소 외부화
- [NEW] `src/starhub-nightsky/data/constellation-lines.csv`
  - 기존 `Constellations.ts`에 포함되어 있던 좌표 데이터를 CSV 형식으로 저장한다.
  - 형식: `abbr,ra_start,dec_start,ra_end,dec_end` (세그먼트 단위)

### 2. 데이터 관리 로직 수정
- [MODIFY] `src/starhub-nightsky/data/ConstellationCatalog.ts`
  - `loadConstellationLinesCsv()`: 별자리선 CSV 파일을 fetch하는 함수 추가.
  - `parseConstellationLinesCsv()`: CSV 내용을 파싱하여 `Map<string, ConstellationPoint[][]>` 형태로 반환하는 로직 추가.
  - `buildConstellationsFromCatalog()`: 로드된 선 데이터를 별자리 정의에 병합하도록 수정.

- [MODIFY] `src/starhub-nightsky/data/Constellations.ts`
  - `CONSTELLATIONS` 상수 내의 거대한 `lines` 데이터를 제거하고 빈 배열로 초기화하거나, 타입을 더 유연하게 조정한다.
  - 별자리 기본 정보(ID, 이름 등)는 유지하되, 좌표 데이터만 외부화한다.

### 3. 라이브러리 초기화 흐름 수정
- [MODIFY] `src/starhub-nightsky/StarhubNightsky.ts`
  - 초기화 시점에 별자리 목록과 함께 별자리선 데이터를 비동기로 로드하는 로직을 추가한다.
  - 데이터 로딩 완료 후 `ConstellationLayer`의 `setConstellations()`를 호출하여 화면에 반영한다.

### 4. 레이어 수정 (필요 시)
- [MODIFY] `src/starhub-nightsky/layers/ConstellationLayer.ts`
  - 데이터가 나중에 로드되어도 `rebuildGeometry()`를 통해 정상적으로 반영될 수 있도록 구조 확인.

## 검증 계획

### 자동 테스트 및 수동 검증
- 브라우저 데모 앱(`src/app/`)을 실행하여 별자리선이 이전과 동일하게 정상적으로 표시되는지 확인.
- 네트워크 탭에서 `constellation-lines.csv` 파일이 정상적으로 fetch되는지 확인.
- 데이터 로딩 중이나 실패 시의 예외 처리 확인.

## 오픈 질문
- 별자리선 데이터 로딩 실패 시 사용자에게 알림을 줄 것인지, 아니면 단순히 선을 그리지 않고 진행할 것인지 결정이 필요함.
- 현재의 세그먼트 방식(`ra1,dec1,ra2,dec2`) 외에 용량을 더 줄이기 위한 인덱스 방식(별의 ID 사용)을 도입할 필요가 있는지 검토. (현재는 요청대로 단순 CSV 분리에 집중)
