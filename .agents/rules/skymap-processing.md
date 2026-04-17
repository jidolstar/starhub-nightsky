# 별지도 이미지 가공 원칙 (Skymap Processing Rules)

이 문서는 `Starhub Nightsky` 엔진의 고해상도 천구 배경 타일을 생성할 때 반드시 지켜야 할 가공 표준을 정의한다.

## 1. 이미지 가공 스펙 (V15 - 최종 검증 완료)

### 원본 데이터 (Inputs)
- **파일 형식**: HDR EXR (또는 4K 이상의 고해상도 이미지)
- **레이아웃**: NASA 표준 Equirectangular (원본 중심이 RA 12h/180도)

### 가공 절차 (Processing)
1. **수평 180도 시프트 (Roll)**: 원본 가로 폭의 정확히 절반(w/2)을 수평으로 밀어낸다. RA 0h가 이미지 좌측 끝에 오도록 배치한다.
   ```python
   img = np.roll(img, w // 2, axis=1)
   ```
2. **수직 반전 (Vertical Flip)**: EXR 원본의 Y축이 아래에서 위로 증가하는 반면 이미지 row는 위에서 아래로 증가하므로, 은하수 중심(궁수자리)이 남쪽 하늘에 오도록 수직 반전을 적용한다.
   ```python
   img = cv2.flip(img, 0)
   ```
3. **데이터 정규화**: HDR 데이터를 WebP로 변환할 때 픽셀 값이 타지 않도록 최대값 기준으로 8비트 스케일링을 수행한다.
   ```python
   img = (img / img.max() * 255).astype(np.uint8)
   ```
4. **수평 회전(`cv2.rotate`) 금지**: 수평 회전은 RA 방향의 흐름을 뒤집으므로 사용하지 않는다.

### 타일링 규격 (Tiling)
- **그리드**: 8 × 4 (가로 8개, 세로 4개) = 32타일
- **개별 타일 크기**: 512 × 512 px
- **출력 폴더**: `public/assets/skymap/{레벨명}/` (예: `z1/`, `z2/`)
- **파일명**: `skymap_{레벨명}_{row}_{col}.webp`
  - z1 예시: `public/assets/skymap/z1/skymap_z1_0_0.png` (row: 0~3, col: 0~7)
  - z2 예시: `public/assets/skymap/z2/skymap_z2_0_0.png` (row: 0~7, col: 0~15, 8K 원본에서만 생성)

## 2. 셰이더 매핑 스펙 (Shader Spec)

가공이 완료된 이미지 전체는 다음 좌표계와 1:1 대응된다.

- **가로축 (U)**: 적경(RA) 0h (좌측, U=0.0) ~ 24h (우측, U=1.0)
- **세로축**: 이미지 row 0 = Dec +90도 (북극), row 3 끝 = Dec -90도 (남극)
  - 셰이더 UV 좌표로 쓸 때: `v = 1.0 - vUv.y` (Three.js SphereGeometry의 V=1이 +Y/북극에 대응)
  - 타일 row 인덱스: `row = floor((1.0 - vUv.y) * 4.0)`

## 3. 도구 유지보수

- 가공 로직은 [tools/generate-tiles.py](../../tools/generate-tiles.py)에 구현되어 있다.
- 타일을 재생성할 때는 반드시 **수평 roll → 수직 flip → 8비트 정규화 → 8×4 타일 분할** 순서를 유지한다.
- 이 순서를 바꾸거나 flip을 생략하면 은하수 중심이 남/북반구 뒤집힌 상태로 렌더된다.
