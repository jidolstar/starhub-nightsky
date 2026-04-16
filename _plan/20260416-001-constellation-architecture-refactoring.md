# 20260416-001-별자리 아키텍처 리팩토링 및 렌더링 버그 수정

## 1. 개요
별자리 데이터 로딩 책임을 `StarhubNightsky` 클래스에서 각 데이터 매니저와 레이어로 이관하여 캡슐화를 강화한다. 또한 레이어 조작 시 발생하는 중복 렌더링(선이 진해지는 현상)과 흐릿한 가시성 문제를 해결하여 시각적 완성도를 높인다.

## 2. 사용자 리뷰 필요 항목
> [!IMPORTANT]
> - **데이터 로딩 주체 변경**: 이제 `StarhubNightsky`는 설정값만 전달하며, 실제 비동기 데이터 로딩은 `Renderer` 산하의 레이어들이 직접 수행한다.
> - **가시성 기본값 상향**: 별자리 선 투명도를 `0.58 -> 0.8`, 경계선 투명도를 `0.2 -> 0.4`로 높여 더 선명하게 보이도록 한다.

## 3. 주요 변경 사항

### 3.1 아키텍처 개선
- **StarhubNightsky.ts**: 비동기 `await` 호출을 제거하고, 레이어 가시성 플래그만 관리한다.
- **SkyRenderer.ts**: 데이터 매니저(`ConstellationCatalog` 등)를 소유하며, 레이어가 생성될 때 해당 매니저 인스턴스를 주입한다.
- **Layer 클래스들**: 주입받은 매니저를 통해 데이터를 로드하고 지오메트리를 갱신한다. 이미 로드 중이거나 완료된 경우 중복 요청을 방지하는 내부 상태를 가진다.

### 3.2 렌더링 버그 수정
- **중복 드로잉 방지**: 레이어 초기화 시 `scene`에 이미 객체가 있는지 확인하고, HTML 오버레이 엘리먼트는 고유 ID를 부여하여 중복 생성을 원천 차단한다.
- **자원 해제(Dispose) 강화**: `dispose()` 호출 시 `Geometry`, `Material`, `Overlay DOM`을 명시적으로 제거하여 메모리 누수와 잔상을 방지한다.
- **애니메이션 정밀도**: 페이드 애니메이션 종료 시 부동소수점 오차를 무시하고 타겟값에 정확히 고정(Snap)한다.

### 3.3 시각 최적화
- 별자리 선 색상을 더 선명하게 조정하고 초기 투명도 값을 0.0으로 명확히 설정한다.

## 4. Proposed Changes

### [MODIFY] [StarhubNightsky.ts](file:///d:/starhub-nightsky/src/starhub-nightsky/StarhubNightsky.ts)
- 데이터 로딩 중계 로직 제거 및 렌더러에 매니저 인스턴스 전달 책임 부여.

### [MODIFY] [SkyRenderer.ts](file:///d:/starhub-nightsky/src/starhub-nightsky/engine/SkyRenderer.ts)
- 레이어 생성 시 매니저 인스턴스 주입.

### [MODIFY] [ConstellationLayer.ts](file:///d:/starhub-nightsky/src/starhub-nightsky/layers/ConstellationLayer.ts)
- 데이터 로딩 로직 내장 및 중복 오버레이 방지 로직 적용.

## 5. 검증 계획
- **반복 조작 테스트**: 레이어를 빠르게 On/Off 하여 선 농도가 변하지 않는지 확인.
- **HMR 테스트**: 코드 수정 시 오버레이 엘리먼트가 하나만 유지되는지 개발자 도구로 검사.
- **선명도 확인**: 초기 로딩 시 선들의 식별력이 개선되었는지 확인.
