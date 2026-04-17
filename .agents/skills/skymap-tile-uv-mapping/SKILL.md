---
name: skymap-tile-uv-mapping
description: SkymapLayer의 fragment shader에서 천구 배경 타일(8×4 그리드)의 RA/Dec → 타일 인덱스 및 타일 내부 UV 좌표 매핑을 수정하거나 검토할 때 사용합니다. 은하수 배경이 보이지 않거나, 격자선과 배경 이미지가 어긋나거나, 하늘 방향이 틀릴 때 이 스킬로 진단합니다.
---

# 천구 배경 타일 UV 좌표 매핑 (SkymapLayer Tile UV Mapping)

`SkymapLayer.ts`의 fragment shader에서 RA/Dec 값을 타일 그리드 좌표로 변환하는 올바른 공식과 타일 배치 규칙을 정의한다.

## 언제 이 스킬을 사용하는가

- 스카이맵 배경(은하수)이 화면에 표시는 되지만 격자선 또는 별 위치와 어긋날 때
- RA/Dec 좌표와 타일 열(col)/행(row) 인덱스의 대응이 의심될 때
- 타일 배치 규칙(RA 0h 위치, Dec 방향)이 변경되어 셰이더를 재조정해야 할 때
- `SkymapLayer.ts`의 fragment shader 내 `raCoord` / `decCoord` 계산 코드를 수정할 때

## 타일 배치 규칙 (V15 스펙 기준)

`public/assets/skymap/z1/skymap_z1_{row}_{col}.png` 파일의 좌표 배치:

| 축 | 배치 |
|---|---|
| 가로(col 0→7) | RA 12h(180°) → RA 0h(0°) → RA 12h(180°), **RA는 왼→오른쪽으로 감소** |
| 세로(row 0→3) | Dec -90°(남극, 상단) → Dec +90°(북극, 하단) |

- **col 0 좌측 끝** = RA 12h (180°)
- **col 4 중앙** = RA 0h (0° / 360°)
- **col 7 우측 끝** = RA 12h 직전 (337.5°)
- **row 0** = Dec -90°~-45° (남극 영역)
- **row 3** = Dec +45°~+90° (북극 영역)

## 사용 방법

### 1. RA → col 인덱스 공식

```glsl
// raNorm: RA를 라디안으로 변환한 값 (0 ~ 2π)
// col 0 = RA 12h, col 4 = RA 0h (중앙), RA는 오른쪽으로 갈수록 감소
float raCoord = mod((PI - raNorm) * 8.0 / (2.0 * PI) + 8.0, 8.0);
```

**검증표**:
| RA | raNorm | raCoord | col |
|---|---|---|---|
| 0h (0°) | 0 | 4.0 | 4 (중앙) |
| 6h (90°) | π/2 | 2.0 | 2 |
| 12h (180°) | π | 0.0 | 0 (좌측 끝) |
| 18h (270°) | 3π/2 | 6.0 | 6 |
| 은하중심 17h45m (≈266°) | ≈4.651 | ≈6.08 | 6 |

> **주의**: `clamp` 대신 `mod`를 사용해야 RA 0h/360° 경계에서 래핑 아티팩트가 없다.

### 2. Dec → row 인덱스 공식

```glsl
// dec: 라디안 단위 적위 (-π/2 ~ +π/2)
float decNorm  = (dec / PI) + 0.5; // 0.0 = Dec -90°(남극), 1.0 = Dec +90°(북극)
float decCoord = clamp(decNorm * 4.0, 0.0, 3.9999);
float row      = floor(decCoord); // 0 = Dec -90°(상단), 3 = Dec +90°(하단)
```

Dec는 `mod` 불필요, 극점을 clamp로 처리한다.

### 3. 타일 내부 UV

```glsl
vec2 tileUv;
tileUv.x = fract(raCoord);   // 0.0 = 타일 좌측(높은 RA), 1.0 = 타일 우측(낮은 RA)
tileUv.y = fract(decCoord);  // 0.0 = 타일 상단(낮은 Dec), 1.0 = 타일 하단(높은 Dec)
```

`DataArrayTexture`는 `flipY=false`이므로 V=0 = 캔버스 픽셀 데이터 첫 행 = 원본 이미지 상단에 대응한다.

### 4. 타일 인덱스 → TextureArray 레이어

```glsl
float col        = floor(raCoord);
float row        = floor(decCoord);
float layerIndex = row * 8.0 + col; // 0 ~ 31
vec4 color       = texture(texArray, vec3(tileUv, layerIndex));
```

### 5. 진단 방법

배경과 격자가 어긋날 때 아래 순서로 확인한다:

1. **적도 격자(Equatorial Grid) 활성화** → 격자선의 RA/Dec 교점과 배경 은하수 위치 비교
2. **은하 중심 기준점**: RA 17h45m, Dec -29° (궁수자리 방향) → 가장 밝은 코어 위치와 일치해야 함
3. **RA 방향 반전 여부**: 은하 중심이 좌우 반전되어 있다면 `PI - raNorm` 공식에서 부호 확인
4. **RA 오프셋 여부**: 은하 위치가 절반(12h) 어긋난다면 `+ 8.0` 오프셋 또는 `PI` 항 확인
5. **Dec 상하 반전 여부**: 남극 영역(별 드문 지역)이 화면 상단/하단에 올바르게 배치되는지 확인
