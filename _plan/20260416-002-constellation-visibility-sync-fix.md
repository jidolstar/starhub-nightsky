# 20260416-002-별자리 레이어 가시성 동기화 및 렌더링 버그 긴급 수정

## 1. 개요
이전 리팩토링 단계에서 지연 로딩 로직이 도입되면서, 데이터 로드 완료 시점과 가시성 플래그 업데이트 시점이 어긋나는 문제가 발생했다. 이로 인해 레이어를 켜도 데이터가 즉시 보이지 않거나, HMR 상황에서 라벨이 중첩되는 현상을 해결한다.

## 2. 사용자 리뷰 필요 항목
> [!IMPORTANT]
> - 데이터가 뒤늦게 오더라도 현재 UI의 체크박스 상태(On/Off)를 기억했다가 자동으로 나타나게 로직을 보강한다.
> - 별자리 이름이 겹쳐 보이는 문제는 HTML 오버레이를 재사용할 때 내부를 완전히 비우도록 해서 해결한다.

## 3. 주요 변경 사항

### 3.1 가시성 동기화 로직 보강
- `loadData()` 비동기 처리가 끝난 후, 현재 `linesVisible` 또는 `boundariesVisible` 플래그를 다시 확인하여 `visible = true`를 강제로 호출한다.
- 데이터가 로드되기 전에는 선명도 애니메이션이 시작되지 않도록 방어 로직을 추가한다.

### 3.2 중복 오버레이 정소
- `existingOverlay`를 감지했을 때, 이전 인스턴스가 남긴 모든 자식 노드를 제거(`innerHTML = ''`)하여 새 인스턴스의 라벨과 겹치지 않게 한다.

### 3.3 렌더링 리소스 선언 및 해제 정밀화
- `rebuildGeometry`에서 `BufferAttribute`를 생성할 때 기존 속성이 있다면 재사용하도록 최적화한다.
- `dispose` 시 씬 제거와 더불어 마테리얼 투명도를 0으로 초기화한다.

## 4. Proposed Changes

### [MODIFY] [ConstellationLayer.ts](file:///d:/starhub-nightsky/src/starhub-nightsky/layers/ConstellationLayer.ts)
- 데이터 로드 완료 후 가시성 재확인 로직 추가.
- 오버레이 재사용 시 하위 요소 초기화.

### [MODIFY] [ConstellationBoundaryLayer.ts](file:///d:/starhub-nightsky/src/starhub-nightsky/layers/ConstellationBoundaryLayer.ts)
- `loadData` 완료 후 `setVisible` 강제 트리거.
- 중복된 메서드 제거 및 코드 정제.

## 5. 검증 계획
- 체크박스를 켜둔 상태에서 페이지를 새로고침/HMR 하여 데이터 로드 후 선이 정상적으로 나타나는지 확인.
- 레이어 On/Off 반복 시 농도가 변하지 않는지 재확인.
- 동일한 별자리 이름이 겹쳐 나오지 않는지 검사.
