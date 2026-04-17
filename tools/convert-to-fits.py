import cv2
import numpy as np
import os
from astropy.io import fits

"""
별지도 EXR 이미지를 천문학 표준 FITS 포맷으로 변환하는 도구
- J2000 Epoch 및 ICRS 기준 정보 포함 (WCS 헤더)
- HDR 데이터를 32비트 부동소수점으로 무손실 변환
- 준비 : 파워쉘에서 pip install astropy opencv-python numpy
- 시작 : $env:OPENCV_IO_ENABLE_OPENEXR=1; $env:OPENCV_IO_MAX_IMAGE_PIXELS=8589934592; python tools/convert-to-fits.py
"""

INPUT_FILE = '_original_images/starmap/starmap_2020_8k.exr'
OUTPUT_FILE = '_original_images/starmap/starmap_2020_8k.fits'

def convert_exr_to_fits():
    # [V17 고도화] OpenCV의 기본 픽셀 제한(약 21억)을 64K 이미지를 위해 해제 (약 85억 픽셀까지)
    os.environ["OPENCV_IO_MAX_IMAGE_PIXELS"] = str(2**33)
    os.environ["OPENCV_IO_ENABLE_OPENEXR"] = "1"
    
    print(f"EXR 로딩 중 (대용량 메모리 사용 예정): {INPUT_FILE}")
    
    if not os.path.exists(INPUT_FILE):
        print("오류: 입력 파일을 찾을 수 없습니다.")
        return

    # EXR 읽기
    # 주의: 64K float32 RGB 데이터는 메모리상에서 약 24GB를 점유합니다.
    img = cv2.imread(INPUT_FILE, cv2.IMREAD_UNCHANGED)
    
    if img is None:
        print("오류: 이미지를 읽을 수 없거나 메모리가 부족합니다.")
        return

    print(f"이미지 로드 완료: {img.shape[1]}x{img.shape[0]}, 타입: {img.dtype}")

    # 메모리 절약을 위해 BGR -> RGB 변환 후 원본 참조 제거
    if len(img.shape) == 3:
        print("BGR -> RGB 채널 변환 중...")
        # cvtColor 대신 수동 채널 swap으로 메모리 복사 최소화 시도
        img = img[:, :, ::-1] 
        
        print("FITS 평면 구조로 재배치 중...")
        # (H, W, C) -> (C, H, W)
        img = np.transpose(img, (2, 0, 1))

    # FITS HDU 생성
    print("FITS HDU 생성 중...")
    hdu = fits.PrimaryHDU(img)
    
    # 헤더 설정
    h = hdu.header
    h['VERSION'] = 'V17-64K-Align'
    h['EQUINOX'] = 2000.0
    h['RADESYS'] = 'ICRS'
    h['CTYPE1'] = 'RA---CAR'
    h['CTYPE2'] = 'DEC--CAR'
    
    width = img.shape[-1]
    height = img.shape[-2]
    
    h['CRVAL1'] = 180.0
    h['CRPIX1'] = width / 2.0
    h['CDELT1'] = -360.0 / width
    
    h['CRVAL2'] = 0.0
    h['CRPIX2'] = height / 2.0
    h['CDELT2'] = 180.0 / height
    
    h['HISTORY'] = 'Converted from 64K EXR using starhub-nightsky V17 tool.'

    print(f"FITS 파일 저장 중 (수십 GB 예상): {OUTPUT_FILE}")
    hdu.writeto(OUTPUT_FILE, overwrite=True)
    print("64K 대용량 변환이 성공적으로 완료되었습니다.")

if __name__ == "__main__":
    convert_exr_to_fits()
