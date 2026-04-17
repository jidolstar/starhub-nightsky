import cv2
import numpy as np
import os
import sys

"""
EXR 별지도 이미지를 웹용 WebP 타일로 변환하는 도구 (V15 - 최종 정렬 버전)
- 수평 180도 시프트(Roll): RA 0h를 좌측 끝으로 배치 (은하수 중심을 18h로 이동)
- 상하 반전(Flip): 북반구/남반구 정렬 교정 (은하수 중심을 남쪽으로 이동)
"""

INPUT_FILE = '_original_images/starmap/starmap_random_2020_4k.exr'
OUTPUT_DIR = 'public/assets/skymap/z1'

# 생성할 포맷 목록. 필요한 포맷만 남기면 된다.
#   'png'  : 무손실 lossless — 파일 크기 큼, 품질 완벽
#   'webp' : 손실 quality 100 — PNG보다 작고 브라우저 지원 우수
OUTPUT_FORMATS = ['png', 'webp']
WEBP_QUALITY = 100

def generate_tiles():
    print(f"이미지 로딩 중: {INPUT_FILE}")
    
    if not os.path.exists(INPUT_FILE):
        print(f"오류: 파일을 찾을 수 없습니다. ({INPUT_FILE})")
        return

    img = cv2.imread(INPUT_FILE, cv2.IMREAD_UNCHANGED)
    
    if img is None:
        print("오류: 이미지를 읽을 수 없습니다.")
        return

    # [최종 보정]
    # 1. 수평 180도 시프트: 중심 12h -> 끝 0h (은하수 중심은 6h에서 18h로 이동)
    print("사용자 지시 및 캡처 분석 반영: 수평 180도 시프트 중 (Roll)...")
    w = img.shape[1]
    img = np.roll(img, w // 2, axis=1)

    # 2. 상하 반전: 북쪽(헤라클레스)에 가 있던 은하수 중심을 남쪽(궁수자리)으로 교정
    print("사용자 지시 및 캡처 분석 반영: 상하 반전 중 (Flip)...")
    img = cv2.flip(img, 0)

    print(f"이미지 가공 완료: {img.shape[1]}x{img.shape[0]}")

    # HDR 데이터를 8비트로 변환
    if img.dtype != np.uint8:
        print("HDR 데이터를 8비트로 변환 중...")
        img_max = np.max(img)
        if img_max > 0:
            img = (img / img_max * 255).astype(np.uint8)
        else:
            img = img.astype(np.uint8)

    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    h, w = img.shape[:2]
    rows, cols = 4, 8  # 32 tiles
    tile_h, tile_w = h // rows, w // cols

    print(f"타일 생성 중 (8x4 = 32개)...")
    
    for r in range(rows):
        for c in range(cols):
            y_start = r * tile_h
            y_end = (r + 1) * tile_h
            x_start = c * tile_w
            x_end = (c + 1) * tile_w

            tile = img[y_start:y_end, x_start:x_end]
            tile_resized = cv2.resize(tile, (512, 512), interpolation=cv2.INTER_LINEAR)
            
            for fmt in OUTPUT_FORMATS:
                if fmt == 'png':
                    out_path = os.path.join(OUTPUT_DIR, f'skymap_z1_{r}_{c}.png')
                    cv2.imwrite(out_path, tile_resized)
                elif fmt == 'webp':
                    out_path = os.path.join(OUTPUT_DIR, f'skymap_z1_{r}_{c}.webp')
                    cv2.imwrite(out_path, tile_resized, [cv2.IMWRITE_WEBP_QUALITY, WEBP_QUALITY])
            
            if (r * cols + c + 1) % 8 == 0:
                print(f"진행률: {r * cols + c + 1}/{rows*cols}")

    print("\n[V15] 최종 정렬 기반 타일 생성이 완료되었습니다.")

if __name__ == "__main__":
    generate_tiles()
