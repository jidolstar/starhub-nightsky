# 20260416-003-별지도 레이어 렌더 루프 및 동적 좌표 갱신 버그 수정

## 1. 개요
리팩토링 후 별자리 데이터 로딩은 정상화되었으나, 데이터가 로드된 이후 실제 3D 좌표를 계산하는 `update` 루틴이 렌더 루프(`requestAnimationFrame`)에서 누락되어 화면에 아무것도 나타나지 않거나 라벨이 중앙에 쏠리는 현상을 해결한다.

## 2. 사용자 리뷰 필요 항목
> [!IMPORTANT]
> - 별자리 이름이 한곳에 뭉쳐 나오는 현상은 좌표 계산 주기가 어긋나서 발생하는 문제입니다.
> - 별자리 선이 안 보이는 현상은 지오메트리 버퍼가 한 번도 채워지지 않았기 때문입니다.
> - 해결책으로 렌더 루프 매 프레임마다 좌표를 갱신하도록 엔진을 수정합니다.

## 3. 주요 변경 사항

### 3.1 SkyRenderer 엔진 루프 수정
- `SkyRenderer.start()`의 애니메이션 루프 내부에 `starLayer`, `constellationLayer`, `constellationBoundaryLayer`, `gridLayer`의 `update` 메서드 호출을 추가한다.
- 현재 관측 위도/경도/시간 정보를 루프 내에서 상시 참조하여 천체의 위치를 실시간으로 동기화한다.

### 3.2 ConstellationLayer 투영 좌표 보정
- 데이터 로드 즉시 최초 1회의 좌표 계산이 보장되도록 `loadData` 완료 시점에 `update` 호출 가능 여부를 확인한다.
- 라벨의 `worldPosition`이 `(0,0,0)`으로 초기화되어 중앙에 쏠리는 현상을 방지하기 위해 초기 계산 로직을 강화한다.

### 3.3 HMR 및 리소스 관리 보강
- Vite HMR 상황에서 이전 렌더 루프(`requestAnimationFrame`)가 중복으로 돌아가지 않도록 `dispose` 로직을 더욱 엄격하게 적용한다.

## 4. Proposed Changes

### [MODIFY] [SkyRenderer.ts](file:///d:/starhub-nightsky/src/starhub-nightsky/engine/SkyRenderer.ts)
- 애니메이션 루프에 레이어 업데이트 로직 통합.
- `updateCelestialLayers` 메서드의 역할을 실시간 루프로 이관.

### [MODIFY] [ConstellationLayer.ts](file:///d:/starhub-nightsky/src/starhub-nightsky/layers/ConstellationLayer.ts)
- `update` 로직의 안정성 확보 및 좌표 투영 공식 재검토.

## 5. 검증 계획
- `npm run dev` 실행 후 첫 화면에서 별자리 선과 이름이 제 위치에 나타나는지 확인.
- 위도/경도/시간 변경 시 별자리가 실시간으로 움직이는지 확인.
- 레이어 On/Off 시 깜빡임이나 겹침 현상 재발 여부 확인.
