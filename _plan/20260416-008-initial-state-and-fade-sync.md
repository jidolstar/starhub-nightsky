# 20260416-008-초기 상태 설정 및 페이드 속도 동기화

## 1. 개요
사용자의 선호에 맞춰 앱 실행 시 최초 시야각(FOV)을 185도로 광각 설정하고 시작 방향을 북쪽으로 고정한다. 또한 각 레이어별로 상이했던 페이드 애니메이션 속도를 통일하여 시각적 일관성을 확보한다.

## 2. 사용자 리뷰 필요 항목
> [!NOTE]
> - **초기 FOV**: 185도 (매우 넓은 어안 렌즈 시야)
> - **초기 방향**: 정북(North)
> - **페이드 속도**: 모든 레이어를 동일한 속도(약 0.03/frame)로 통일하여 조화로운 On/Off 애니메이션을 제공합니다.

## 3. 주요 변경 사항

### 3.1 초기 렌더링 상태 변경
- `SkyRenderer`의 카메라 초기 FOV를 185로 설정.
- 실행 시 카메라가 정북(North)을 바라보도록 쿼터니언 또는 오일러 각 초기화.

### 3.2 페이드 속도(fadeSpeed) 전역 동기화
- `ConstellationLayer.ts`
- `ConstellationBoundaryLayer.ts`
- `GridLayer.ts`
- `CardinalDirectionLayer.ts`
- 위 모든 레이어의 `fadeSpeed` 상수를 동일한 값으로 수정.

## 4. Proposed Changes

### [MODIFY] [SkyRenderer.ts](file:///d:/starhub-nightsky/src/starhub-nightsky/engine/SkyRenderer.ts)
- 생성자 및 초기화 메서드에서 FOV와 초기 시점 설정.

### [MODIFY] [ConstellationLayer.ts](file:///d:/starhub-nightsky/src/starhub-nightsky/layers/ConstellationLayer.ts)
- `fadeSpeed` 값 조정.

### [MODIFY] [ConstellationBoundaryLayer.ts](file:///d:/starhub-nightsky/src/starhub-nightsky/layers/ConstellationBoundaryLayer.ts)
- `fadeSpeed` 값 조정.

### [MODIFY] [GridLayer.ts](file:///d:/starhub-nightsky/src/starhub-nightsky/layers/GridLayer.ts)
- `fadeSpeed` 값 조정.

### [MODIFY] [CardinalDirectionLayer.ts](file:///d:/starhub-nightsky/src/starhub-nightsky/layers/CardinalDirectionLayer.ts)
- `fadeSpeed` 값 조정.

## 5. 검증 계획
- 새로고침 시 화면이 북쪽을 향하고 매우 넓은 시야(185도)로 시작하는지 확인.
- 격자, 별자리 선, 경계선을 동시에 켜거나 껐을 때 나타나고 사라지는 속도가 정확히 일치하는지 시각적으로 확인.
