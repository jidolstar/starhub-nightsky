# 20260416-010-지면 레이어 페이드 애니메이션 적용

## 1. 개요
지면(Landscape) 레이어를 켜고 끌 때 다른 천체 레이어들과 마찬가지로 부드럽게 나타나고 사라지는 페이드 애니메이션을 적용한다. 시각적 일관성을 위해 0.03의 페이드 속도를 동일하게 사용한다.

## 2. 사용자 리뷰 필요 항목
> [!NOTE]
> - **페이드 방식**: 셰이더의 `opacity` 유니폼을 조작하여 부드러운 전환을 구현합니다.
> - **속도 동기화**: 다른 레이어와 동일한 `0.03/frame` 속도를 사용하여 UI 조작 시 통일감을 제공합니다.

## 3. 주요 변경 사항

### [MODIFY] [LandscapeLayer.ts](file:///d:/starhub-nightsky/src/starhub-nightsky/layers/LandscapeLayer.ts)
- `fadeSpeed`, `currentOpacity`, `targetOpacity` 프로퍼티 추가.
- `ShaderMaterial`에 `opacity` 유니폼 변수 추가 및 적용.
- `update()` 메서드를 추가하여 매 프레임 애니메이션 상태 갱신.
- `setVisibility()` 메서드가 타겟 투명도를 설정하도록 변경.

### [MODIFY] [SkyRenderer.ts](file:///d:/starhub-nightsky/src/starhub-nightsky/engine/SkyRenderer.ts)
- 렌더 루프(`start`)에서 `landscapeLayer.update()`를 매 프레임 호출하도록 통합.

## 4. 검증 계획
- 지면 표시 체크박스를 해제했을 때 지면이 즉시 사라지지 않고 서서히 투명해지며 사라지는지 확인.
- 다시 켰을 때 서서히 나타나는지 확인.
- 다른 레이어(격자 등)와 동시에 On/Off 시 속도가 일치하는지 확인.
