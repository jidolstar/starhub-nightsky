import numpy as np
import os
import cv2
from astropy.io import fits

"""
FITS 별지도 이미지를 웹용 WebP 타일로 변환하는 도구 (V2)

지원 해상도:
  - 4K (4096×2048): z1(8×4=32타일) 자동 생성
  - 8K (8192×4096): z1(8×4=32타일) + z2(16×8=128타일) 자동 생성

FITS 좌표계 특성에 따른 처리:
  - CDELT1 < 0 → 수평 반전 (RA 방향 교정, 0h를 좌측으로)
  - FITS row 0 = 이미지 하단(Dec -90°) → 수직 반전 (row 0을 Dec +90°/북극으로)
  - (C,H,W) RGB → (H,W,C) BGR 변환 (OpenCV 저장용)

출력 파일명:
  - z1: public/assets/skymap/skymap_z1_{row}_{col}.webp (row: 0~3,  col: 0~7)
  - z2: public/assets/skymap/skymap_z2_{row}_{col}.webp (row: 0~7,  col: 0~15)

준비:
  pip install astropy opencv-python numpy

실행:
  python tools/generate-tiles-fits.py
"""

INPUT_FILE = '_original_images/starmap/starmap_2020_8k.fits'
OUTPUT_BASE_DIR = 'public/assets/skymap'
TILE_SIZE = 512

# 생성할 포맷 목록. 필요한 포맷만 남기면 된다.
#   'png'  : 무손실 lossless — 파일 크기 큼, 품질 완벽
#   'webp' : 손실 quality 100 — PNG보다 작고 브라우저 지원 우수
OUTPUT_FORMATS = ['png', 'webp']
WEBP_QUALITY = 100

# 줌 레벨 정의: {레벨명: (cols, rows)}
# 출력 폴더: public/assets/skymap/{레벨명}/skymap_{레벨명}_{row}_{col}.webp
ZOOM_LEVELS = {
    'z1': (8, 4),    # 32타일 — 4K 이상에서 생성
    'z2': (16, 8),   # 128타일 — 8K 이상에서만 생성
}

# 줌 레벨별 최소 요구 가로 해상도
ZOOM_MIN_WIDTH = {
    'z1': 1,
    'z2': 6000,  # 8K(8192)는 이 기준을 넘으므로 z2 활성화
}


def load_and_preprocess(input_file: str) -> np.ndarray:
    """FITS 파일을 읽고 좌표계를 타일 규격에 맞게 교정한다."""
    print(f"FITS 파일 로딩 중: {input_file}")

    with fits.open(input_file) as hdul:
        hdul.info()
        data = hdul[0].data.copy()  # 파일 핸들 해제를 위해 copy
        header = hdul[0].header

    print(f"데이터 형태: {data.shape}, 타입: {data.dtype}")
    cdelt1 = header.get('CDELT1', None)
    cdelt2 = header.get('CDELT2', None)
    print(f"WCS: CDELT1={cdelt1}, CDELT2={cdelt2}")

    # (C, H, W) -> (H, W, C) 변환
    # convert-to-fits.py가 np.transpose(img, (2,0,1))로 저장했으므로 역변환
    if data.ndim == 3 and data.shape[0] in (1, 3, 4):
        print("채널 축 변환 중 (C,H,W) -> (H,W,C)...")
        img = np.transpose(data, (1, 2, 0))
    elif data.ndim == 2:
        print("단채널 이미지 감지 → (H,W,1)로 변환...")
        img = data[:, :, np.newaxis]
    else:
        img = data.copy()

    # [수평 반전] CDELT1 < 0 이면 RA가 왼쪽→오른쪽으로 감소.
    # 타일 규격(RA 0h = 좌측)에 맞추려면 수평 반전으로 방향을 교정한다.
    if cdelt1 is not None and cdelt1 < 0:
        print(f"CDELT1={cdelt1:.4f} (RA 감소 방향) → 수평 반전으로 RA 방향 교정 중...")
        img = np.fliplr(img)
    else:
        print(f"CDELT1={cdelt1} → 수평 반전 생략")

    # [수직 반전] FITS 표준에서 row 0은 이미지 하단(Dec -90°, 남극).
    # 타일 row 0이 Dec +90°(북극)이 되도록 수직 반전을 적용한다.
    print("수직 반전으로 Dec 방향 교정 중 (flipud)...")
    img = np.flipud(img)

    # HDR 데이터를 8비트로 변환
    if img.dtype != np.uint8:
        print(f"HDR 데이터({img.dtype})를 8비트로 변환 중...")
        img_max = np.max(img)
        if img_max > 0:
            img = (img / img_max * 255).astype(np.uint8)
        else:
            img = img.astype(np.uint8)

    # astropy는 RGB 순서로 저장 (convert-to-fits.py에서 BGR→RGB 변환 후 저장).
    # OpenCV 저장을 위해 RGB → BGR로 재변환한다.
    if img.ndim == 3 and img.shape[2] == 3:
        print("RGB -> BGR 채널 변환 중...")
        img = img[:, :, ::-1]

    print(f"이미지 가공 완료: {img.shape[1]}x{img.shape[0]}")
    return img


def generate_zoom_level(img: np.ndarray, level: str, cols: int, rows: int, out_dir: str):
    """단일 줌 레벨의 타일을 생성한다."""
    total = cols * rows
    print(f"\n[{level}] {cols}×{rows} = {total}타일 생성 중...")
    print(f"  출력 폴더: {out_dir}")

    os.makedirs(out_dir, exist_ok=True)

    h, w = img.shape[:2]
    tile_h = h // rows
    tile_w = w // cols

    print(f"  원본 타일 크기: {tile_w}×{tile_h} → {TILE_SIZE}×{TILE_SIZE}로 리사이즈")

    for r in range(rows):
        for c in range(cols):
            y_start = r * tile_h
            y_end = (r + 1) * tile_h
            x_start = c * tile_w
            x_end = (c + 1) * tile_w

            tile = img[y_start:y_end, x_start:x_end]
            tile_resized = cv2.resize(tile, (TILE_SIZE, TILE_SIZE), interpolation=cv2.INTER_AREA)

            for fmt in OUTPUT_FORMATS:
                if fmt == 'png':
                    out_path = os.path.join(out_dir, f'skymap_{level}_{r}_{c}.png')
                    cv2.imwrite(out_path, tile_resized)
                elif fmt == 'webp':
                    out_path = os.path.join(out_dir, f'skymap_{level}_{r}_{c}.webp')
                    cv2.imwrite(out_path, tile_resized, [cv2.IMWRITE_WEBP_QUALITY, WEBP_QUALITY])

            idx = r * cols + c + 1
            if idx % cols == 0:
                print(f"  진행률: {idx}/{total}")

    print(f"[{level}] 완료 → {out_dir}/skymap_{level}_{{row}}_{{col}}.webp")


def generate_tiles():
    if not os.path.exists(INPUT_FILE):
        print(f"오류: 파일을 찾을 수 없습니다. ({INPUT_FILE})")
        return

    img = load_and_preprocess(INPUT_FILE)
    img_width = img.shape[1]

    # 해상도에 따라 생성할 줌 레벨 결정
    active_levels = {
        level: dims
        for level, dims in ZOOM_LEVELS.items()
        if img_width >= ZOOM_MIN_WIDTH[level]
    }

    print(f"\n이미지 가로 해상도: {img_width}px")
    print(f"생성할 줌 레벨: {list(active_levels.keys())}")

    for level, (cols, rows) in active_levels.items():
        out_dir = os.path.join(OUTPUT_BASE_DIR, level)  # e.g. public/assets/skymap/z1
        generate_zoom_level(img, level, cols, rows, out_dir)

    print("\n모든 줌 레벨 타일 생성이 완료되었습니다.")


if __name__ == "__main__":
    generate_tiles()
