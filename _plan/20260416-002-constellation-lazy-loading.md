# 별자리 데이터 지연 로딩(Lazy Loading) 구현 계획

별자리선 및 별자리명 데이터(CSV)를 앱 초기화 시점이 아닌, 실제 화면에 표시가 필요할 때 로드하도록 구조를 변경합니다.

## 제안된 변경 사항

### 1. [StarhubNightsky](file:///d:/starhub-nightsky/src/starhub-nightsky/StarhubNightsky.ts)
- **로딩 상태 관리**: 별자리 데이터 로딩 상태를 추적하기 위해 `defaultConstellationsPromise` 멤버 변수를 추가합니다.
- **자동 로딩 트리거**: 아래 메서드들이 호출될 때 `visible`이 `true`라면 내부적으로 데이터를 로드합니다.
    - `setConstellationLinesVisible`
    - `setConstellationLabelsVisible`
    - `setConstellationsVisible`
    - `setLayerVisibility`
- **멱등성 확보**: `loadDefaultConstellations()`가 여러 번 호출되어도 한 번만 fetch가 일어나도록 Promise 캐싱 로직을 보강합니다.

### 2. [SkyCanvas.vue](file:///d:/starhub-nightsky/src/app/components/SkyCanvas.vue)
- **초기화 로직 수정**: `onMounted`에서 `instance.loadDefaultConstellations()`를 호출하던 부분을 제거합니다. 이제 사용자가 UI에서 체크박스를 켤 때 라이브러리가 알아서 로드합니다.

## 검증 계획

### 수동 검증
1. 브라우저 개발자 도구의 **Network** 탭을 엽니다.
2. 페이지를 새로고침했을 때 `constellation-catalog.csv`와 `constellation-lines.csv`가 로드되지 않는지 확인합니다.
3. "별자리 선 표시" 또는 "별자리 이름 표시" 체크박스를 클릭합니다.
4. 그 즉시 CSV 파일들이 로드되고, 화면에 별자리선/이름이 나타나는지 확인합니다.
5. 체크박스를 여러 번 껐다 켜도 추가적인 네트워크 요청이 발생하지 않는지 확인합니다.
