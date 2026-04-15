---
trigger: always_on
---

## Architecture
- `src/starhub-nightsky/`는 npm 배포를 염두에 둔 라이브러리 경계입니다.
- 외부 앱은 `StarhubNightsky` 대표 클래스를 통해서만 별지도 기능을 조작합니다.
- `src/starhub-nightsky/` 내부 코드는 Vue, Pinia, 앱 컴포넌트에 의존하지 않습니다.
- 별지도 내부 계산과 렌더링 유틸은 `src/starhub-nightsky/math`, `src/starhub-nightsky/catalog`, `src/starhub-nightsky/layers`, `src/starhub-nightsky/engine` 아래에 둡니다.
- `src/app/`은 Vue 데모 앱/어댑터 영역입니다. 이 영역은 라이브러리를 사용할 수 있지만, 라이브러리가 이 영역을 import하면 안 됩니다.

## TypeScript
- 명확한 타입 지정을 위해 가능한 `any` 사용을 피하고, 구체적인 interface/type을 정의합니다.
