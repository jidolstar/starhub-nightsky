# CLAUDE.md

이 문서는 Claude(또는 다른 AI 코딩 에이전트)가 이 저장소에서 작업할 때 빠르게 맥락을 잡기 위한 온보딩 가이드다. 사용자 대상 소개는 [README.md](README.md)를 참조.

## 세션 시작 시 필수 로드 (최우선)

이 프로젝트는 [.agents/](.agents/) 하위에 프로젝트 전용 룰과 스킬을 정의한다. **이 로컬 룰이 Claude의 최상위 프로젝트 지침**이며 CLAUDE.md 본문보다 우선한다.

### [.agents/rules/](.agents/rules/) — 항상 로드할 규칙 (`trigger: always_on`)

세션 시작 시 아래 문서들을 전부 먼저 읽는다:

- [00-bootstrap.md](.agents/rules/00-bootstrap.md) — 세션 시작 프로토콜 (로컬 룰이 최우선, 스킬 매칭 시 선로드)
- [language.md](.agents/rules/language.md) — 모든 응답·아티팩트는 **한국어**, **경어체 금지**(평어체 `~다/~이다`)
- [architecture.md](.agents/rules/architecture.md) — [src/starhub-nightsky/](src/starhub-nightsky/)는 npm 배포 라이브러리 경계. Vue/Pinia/앱 컴포넌트를 import 금지. `any` 지양.
- [documents.md](.agents/rules/documents.md) — JSDoc 한국어 주석 필수, 플랜은 `_plan/YYYYMMDD-NNN-제목.md` 형식, README/CHANGELOG는 임의 수정 말고 항상 확인 후 업데이트
- [skills.md](.agents/rules/skills.md) — 새 스킬 작성 규칙 (폴더 + `SKILL.md` + YAML 프런트매터)
- [skymap-processing.md](.agents/rules/skymap-processing.md) — 천구 배경 타일 V15 가공 스펙 (수평 roll + 수직 flip, 8×4 PNG/WebP q100, 폴더 `z1/z2/` 분리)

### [.agents/skills/](.agents/skills/) — 작업 매칭 시 로드할 스킬

작업이 스킬의 `description`과 매칭되면 편집 전에 해당 `SKILL.md`를 로드한다.

- [threejs-render-order](.agents/skills/threejs-render-order/SKILL.md) — Three.js 투명 객체 렌더링 순서 충돌(깜빡임, 갑자기 밝아짐) 해결

새 스킬을 작성할 때는 [.agents/rules/skills.md](.agents/rules/skills.md) 규칙을 따른다.

## 프로젝트 정의

Three.js + Vue 3 기반 웹 플라네타리움 엔진. Stellarium 수준 UX를 웹/모바일에서 구현하는 것이 목표. UI·주석·커밋 메시지는 **한국어**가 기본.

라이브 데모: https://jidolstar.github.io/starhub-nightsky/

## 기술 스택

- **Engine**: Three.js 0.183 (WebGL2 가정)
- **UI Framework**: Vue 3.5 (Composition API) + Pinia 3
- **Language**: TypeScript (strict)
- **Build**: Vite + `vue-tsc`
- **천체 계산**: `astronomy-engine` (세차 보정, 지평 좌표 변환)
- **이미지 처리(도구)**: Python + OpenCV (`tools/generate-tiles.py`). `sharp`가 `package.json`에 있으나 현재는 미사용.

## 디렉토리 맵

```
src/
  app/                          # Vue UI 레이어
    components/SkyCanvas.vue    # 엔진을 마운트하는 메인 컴포넌트
    store/useSkyStore.ts        # Pinia: 관측지, 시각, FOV, 레이어 토글
  starhub-nightsky/             # 프레임워크 중립 렌더 엔진 (재사용 가능한 라이브러리)
    StarhubNightsky.ts          # 퍼블릭 파사드 (엔진 진입점)
    engine/
      SkyRenderer.ts            # Three 씬/카메라/렌더 루프 조율
      CameraController.ts       # 마우스·터치·핀치줌·FOV 제어
    layers/                     # 각 시각 요소가 독립 Layer 클래스
      StarLayer.ts
      GridLayer.ts              # 방위·적도 격자
      LandscapeLayer.ts         # 절차적 지평선 (FBM 노이즈 셰이더)
      CardinalDirectionLayer.ts # 동서남북 라벨 (DOM 오버레이)
      ConstellationLayer.ts     # 별자리 선 + 라벨
      ConstellationBoundaryLayer.ts
      SkymapLayer.ts            # 천구 배경 이미지 (은하수)
    math/CelestialMath.ts       # calculateAzAlt, j2000ToJNow
    types.ts                    # LayerVisibilityOptions 등 공용 타입
public/
  assets/data/                  # 별 카탈로그, 별자리 선/경계 JSON
  assets/skymap/
    z1/                         # 줌 레벨 1: 8×4=32타일 (4K 이상 원본)
    z2/                         # 줌 레벨 2: 16×8=128타일 (8K 이상 원본에서만 생성)
tools/
  generate-tiles.py             # EXR -> PNG + WebP q100 타일 (8×4, z1만)
  generate-tiles-fits.py        # FITS -> PNG + WebP q100 타일 (해상도 기반 z1/z2 자동)
  convert-to-fits.py            # EXR -> FITS 변환기 (아카이브용, 웹 미사용)
_original_images/starmap/       # EXR 원본 (대용량, git 제외 권장)
_plan/                          # 작업 플랜 문서 (한국어)
.agents/rules/                  # 프로젝트 규칙 문서 (skymap-processing.md 등)
```

## 아키텍처 핵심 패턴

### 레이어 아키텍처

모든 시각 요소는 독립 Layer 클래스로 분리. 각 Layer는 다음 인터페이스를 준수한다:

- `constructor(scene, ...)` — 생성 시 Mesh를 scene에 추가
- `update(lat, lon, time, ...)` — 매 프레임 위치/회전 갱신
- `updateUniforms(fov, aspect, ...)` — 셰이더 유니폼 갱신
- `setVisibility(visible)` — 페이드 애니메이션 동반 토글
- `dispose()` — 리소스 해제

[SkyRenderer.ts](src/starhub-nightsky/engine/SkyRenderer.ts)가 모든 레이어를 소유하고 렌더 루프에서 순서대로 `update`/`updateUniforms`를 호출한다.

### 185도 FOV 커스텀 투영 (중요)

[SkyRenderer.ts](src/starhub-nightsky/engine/SkyRenderer.ts)는 `PerspectiveCamera(185, ...)`를 사용한다. Three의 표준 perspective matrix는 FOV가 180도를 넘으면 `tan(90+)`에서 발산하여 사용 불가. 따라서 **모든 레이어의 버텍스 셰이더는 Three의 `projectionMatrix`를 거치지 않고 직접 스테레오그래픽 투영을 수행**한다:

```glsl
vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
vec3 dir = normalize(mvPosition.xyz);
float scale = 1.0 / tan(radians(fov) / 4.0);
vec2 proj   = vec2(dir.x, dir.y) / (1.0 - dir.z) * scale;
gl_Position = vec4(proj.x / aspect, proj.y, -dir.z * 0.001, 1.0);
```

참조 구현: [LandscapeLayer.ts](src/starhub-nightsky/layers/LandscapeLayer.ts), [GridLayer.ts](src/starhub-nightsky/layers/GridLayer.ts), [ConstellationLayer.ts](src/starhub-nightsky/layers/ConstellationLayer.ts).

**결과**: 새 레이어 추가 시 `MeshBasicMaterial` 같은 기본 머티리얼은 동작하지 않는다. 반드시 `ShaderMaterial`로 위 패턴을 복제해야 한다. `fov`, `aspect`는 uniform으로 받아 `updateUniforms`에서 매 프레임 갱신.

### 좌표 변환 관례

- **J2000 -> JNow** 세차 보정: `j2000ToJNow(ra, dec, date)` → `{ra, dec}`
- **적도 -> 지평**: `calculateAzAlt(ra, dec, lat, lon, date)` → `{az, alt}` (도 단위)
- **지평 -> Three 월드 벡터**: `(cos(alt)*sin(az), sin(alt), -cos(alt)*cos(az))`
  - +Y 축이 천정
  - -Z 축이 북쪽 (az=0)
  - +X 축이 동쪽 (az=90)
- 정밀도는 `astronomy-engine` 패키지가 담당. 자체 구현 금지.

### 상태 관리 분리

- **엔진 코어** ([starhub-nightsky/](src/starhub-nightsky/))는 Vue/Pinia에 의존하지 않는 프레임워크 중립 라이브러리. [StarhubNightsky.ts](src/starhub-nightsky/StarhubNightsky.ts)가 외부 노출용 파사드.
- **Vue 통합**은 [useSkyStore.ts](src/app/store/useSkyStore.ts)의 Pinia ref로 관측지·시각·FOV·레이어 토글을 보유. [SkyCanvas.vue](src/app/components/SkyCanvas.vue)가 store의 reactive 값을 `watch`로 감지해 엔진의 setter(예: `setSkymapVisible`, `setObserver`)를 호출.

## 에셋 파이프라인

### 별·별자리 데이터

`public/assets/data/`에 JSON/바이너리로 배치. 엔진 생성 시 `assetPath` 옵션으로 위치 전달 ([StarhubNightsky.ts](src/starhub-nightsky/StarhubNightsky.ts)).

### 천구 배경 타일

규칙 문서: [.agents/rules/skymap-processing.md](.agents/rules/skymap-processing.md) (V15 스펙)

**폴더 구조**
- `public/assets/skymap/z1/skymap_z1_{r}_{c}.png` — z1: 8×4=32타일 (r: 0~3, c: 0~7, 각 512×512)
- `public/assets/skymap/z2/skymap_z2_{r}_{c}.png` — z2: 16×8=128타일 (8K 원본에서만 생성)
- PNG(무손실)와 WebP q100(손실) 두 포맷 동시 생성. 렌더러는 SkymapLayer.ts URL 확장자로 포맷 결정.

**좌표 매핑**: `U = RA 0h→24h (left→right)`, `V = Dec +90°→-90° (top→bottom)`

**생성기 두 종류**

| 파일 | 입력 | 용도 |
|---|---|---|
| [tools/generate-tiles.py](tools/generate-tiles.py) | EXR 4K | 수평 roll + 수직 flip → z1만 생성 |
| [tools/generate-tiles-fits.py](tools/generate-tiles-fits.py) | FITS 4K/8K | 수평 fliplr + 수직 flipud → 해상도에 따라 z1/z2 자동 결정 |

npm 스크립트 없음. 수동 실행:
```bash
# EXR 기반 (4K)
python tools/generate-tiles.py
# FITS 기반 (4K: z1, 8K: z1+z2)
python tools/generate-tiles-fits.py
```

**Python 의존성**: `pip install opencv-python numpy astropy`

## 작업 규칙

### 빌드/실행

- `npm run dev` — Vite 개발 서버 (HMR). 모바일 디바이스 테스트는 `--host` 옵션으로 외부 접근 허용.
- `npm run build` — `vue-tsc -b` 타입체크 후 Vite 프로덕션 빌드.
- `npm run preview` — 빌드 결과물 로컬 서빙.
- `./github-deploy.bat` — 자동 패치 버전 범프 + gh-pages 배포 (PowerShell 전용).

### 파일 읽기 주의

- 주석·문서·변수 설명은 한국어. UTF-8 인코딩.
- [_plan/](_plan/) 문서들은 **과거 제안서·작업 기록**이며 현재 코드 상태와 반드시 일치하지 않는다. 코드를 진실의 원천으로 삼되, 플랜 문서는 의도·맥락 파악용으로만 참조.

### 새 레이어 추가 절차

1. [src/starhub-nightsky/layers/](src/starhub-nightsky/layers/)에 클래스 추가 (`update`, `updateUniforms`, `setVisibility`, `dispose` 시그니처 준수)
2. 버텍스 셰이더에 **185도 스테레오그래픽 투영 패턴** 복제 (위 "아키텍처 핵심 패턴" 참조)
3. [SkyRenderer.ts](src/starhub-nightsky/engine/SkyRenderer.ts)에서 인스턴스화 + 렌더 루프에서 `update`/`updateUniforms` 호출 + `setLayerVisibility`에 연결
4. [types.ts](src/starhub-nightsky/types.ts)의 `LayerVisibilityOptions`에 필드 추가
5. `DEFAULT_LAYER_VISIBILITY`에 기본값 설정
6. Vue UI: [useSkyStore.ts](src/app/store/useSkyStore.ts)에 ref 추가, [SkyCanvas.vue](src/app/components/SkyCanvas.vue)에서 `watch` + 체크박스 연결

## 진행 중 이슈 (2026-04-17 시점)

- [SkymapLayer.ts](src/starhub-nightsky/layers/SkymapLayer.ts)가 **풀스크린 쿼드 + 역-스테레오그래픽 접근**으로 설계되어 있으나 185도 FOV 투영 모델과 맞지 않아 배경이 렌더되지 않는 상태. 인사이드-페이싱 `SphereGeometry` + 표준 UV 기반 샘플링으로 재작성 필요. 관련 플랜: [_plan/20260416-001-skymap-dual-mesh-fix.md](_plan/20260416-001-skymap-dual-mesh-fix.md).
