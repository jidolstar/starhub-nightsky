# 20260416-015-초기 카메라 북극성 조준 구현

## 1. 개요
앱 실행 시 카메라가 정북(Azimuth 0)의 지평선(Altitude 0)이 아닌, 관측자의 위도에 해당하는 북극성(Polaris) 방향을 바라보도록 초기 시점을 조정한다.

## 2. 사용자 리뷰 필요 항목
> [!NOTE]
> - **자동 정렬**: 앱 로드 시 한 번만 수행됩니다. 이후 사용자가 조작하면 해당 위치가 유지됩니다.
> - **위도 연동**: 북극성의 고도는 관측자의 위도와 거의 일치하므로, 설정된 관측 위치가 바뀌면 초기 시점도 그에 맞춰 변하게 됩니다.

## 3. 주요 변경 사항

### [MODIFY] [CameraController.ts](file:///d:/starhub-nightsky/src/starhub-nightsky/engine/CameraController.ts)
- **메서드 추가**: `setCameraAngles(azimuth: number, altitude: number)` 
    - 내부 상태인 `cameraAzimuth`와 `cameraAltitude`를 업데이트하고 `updateCameraLook()`을 호출하여 물리적으로 카메라를 회전시키는 기능을 외부로 노출한다.

### [MODIFY] [SkyRenderer.ts](file:///d:/starhub-nightsky/src/starhub-nightsky/engine/SkyRenderer.ts)
- **생성자 로직 수정**: `cameraController` 인스턴스 생성 직후, 현재 `this.observer.lat` 값을 사용하여 카메라를 북극성 방향으로 정렬한다.
    - 예: `this.cameraController.setCameraAngles(0, this.observer.lat);`

## 4. 검증 계획
- **초기 로드 테스트**: 앱 실행 시 카메라가 지평선 위쪽(위도 값만큼)을 향하고 있는지 확인한다.
- **위도 변경 테스트**: 서울(37도)과 호주(남반구) 등 다른 위도에서 실행 시 북극성(또는 천구의 북극) 방향을 다르게 가리키는지 확인한다.
- **조작 간섭 체크**: 초기 정렬 후 사용자의 드래그/줌 조작이 여전히 정상적으로 작동하는지 확인한다.
