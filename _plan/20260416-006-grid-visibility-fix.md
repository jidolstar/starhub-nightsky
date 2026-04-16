# 20260416-006-격자 가시성 및 밝기 버그 수정

## 1. 개요
페이드 애니메이션 적용 후 지평좌표 격자가 너무 어둡게 보이거나, 적도좌표 격자가 적도선만 나타나는 현상을 해결한다. 이는 가시성 상태값 불일치와 투명도 타겟값이 낮게 설정되어 발생한 문제이다.

## 2. 사용자 리뷰 필요 항목
> [!IMPORTANT]
> - 지평좌표 격자의 최대 투명도를 0.6에서 1.0으로 상향하여 가시성을 확보합니다.
> - 적도좌표 격자가 애니메이션 도중에도 정상적으로 모든 선을 그리도록 좌표 갱신 로직을 보강합니다.

## 3. 주요 변경 사항

### 3.1 GridLayer 밝기 조정
- `azimuthalTargetOpacity`의 기본 활성값을 `1.0`으로 변경.
- `equatorialTargetOpacity`의 기본 활성값을 `1.0`으로 변경.

### 3.2 적도 격자 좌표 갱신 로직 보강
- `updateEquatorialGeometry`가 부모 그룹인 `equatorialGroup.visible` 뿐만 아니라 현재 투명도 상태(`equatorialCurrentOpacity > 0`)를 기준으로 동작하도록 수정.
- 생성자에서 초기 가시성 설정을 일원화하여 갱신 루틴이 막히지 않도록 조정.

## 4. Proposed Changes

### [MODIFY] [GridLayer.ts](file:///d:/starhub-nightsky/src/starhub-nightsky/layers/GridLayer.ts)
- 투명도 타겟값 상향 및 가시성 체크 조건 완화.

## 5. 검증 계획
- 지평좌표 격자를 켰을 때 충분한 밝기(가시성)가 확보되는지 확인.
- 적도좌표 격자를 켰을 때 적도선 외에 다른 적경/적위 선들도 모두 부드럽게 나타나는지 확인.
