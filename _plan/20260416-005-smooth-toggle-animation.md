# 20260416-005-격자 및 방위 표시 페이드 애니메이션 적용

## 1. 개요
별자리 선/경계선과 마찬가지로 지평/적도 격자 및 동서남북 방위 표시에도 부드러운 전환(Fade In/Out) 효과를 적용하여 사용자 경험을 개선한다. 갑작스러운 나타남/사라짐으로 인한 시각적 충격을 줄인다.

## 2. 사용자 리뷰 필요 항목
> [!NOTE]
> - 모든 On/Off 조작 시 약 0.5초에 걸쳐 부드럽게 나타나거나 사라집니다.
> - 격자(Grid)는 셰이더 투명도를 통해, 방위 표시는 DOM 오버레이의 CSS 투명도를 통해 애니메이션됩니다.

## 3. 주요 변경 사항

### 3.1 GridLayer 페이드 로직 추가
- 지평 격자 및 적도 격자의 타겟 투명도(`targetOpacity`) 상태를 추가한다.
- `update` 메서드 내에서 현재 투명도를 타겟 값으로 점진적으로 보간한다.
- 셰이더 유니폼에 갱신된 투명도를 반영한다.

### 3.2 CardinalDirectionLayer 페이드 로직 추가
- DOM 오버레이의 `opacity`를 점진적으로 조절하는 로직을 추가한다.
- `setVisible(true/false)` 시 즉시 `display`를 끄지 않고, 투명도가 0이 된 후 혹은 애니메이션 중에 관리한다.

## 4. Proposed Changes

### [MODIFY] [GridLayer.ts](file:///d:/starhub-nightsky/src/starhub-nightsky/layers/GridLayer.ts)
- `update` 루프에 투명도 보간 로직 통합.
- `toggleGrids`가 타켓 투명도를 제어하도록 변경.

### [MODIFY] [CardinalDirectionLayer.ts](file:///d:/starhub-nightsky/src/starhub-nightsky/layers/CardinalDirectionLayer.ts)
- `setVisible` 시 CSS `transition` 혹은 루프 기반 `opacity` 업데이트 적용.

## 5. 검증 계획
- UI에서 격자 토글 시 부드럽게 변하는지 확인.
- 방위 표시(N, E, S, W) 토글 시 부드럽게 변하는지 확인.
- 페이드 도중 반대 방향으로 토글했을 때 기현상이 없는지 확인.
