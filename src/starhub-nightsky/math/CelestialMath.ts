import { Horizon, Observer, Rotation_EQJ_EQD, RotateVector, Vector, AstroTime } from 'astronomy-engine';

/**
 * 적경/적위 좌표를 방위각/고도 좌표로 변환합니다.
 * astronomy-engine 패키지를 활용하여 대기 굴절(Refraction) 등 고정밀 천체 계산을 수행합니다.
 * 
 * @param ra 적경 (단위: 도, 0~360)
 * @param dec 적위 (단위: 도, -90~90)
 * @param lat 관측자 위도 (단위: 도)
 * @param lon 관측자 경도 (단위: 도)
 * @param date 관측 일시
 * @returns { az: 방위각, alt: 고도 } (단위: 도)
 */
export function calculateAzAlt(ra: number, dec: number, lat: number, lon: number, date: Date): { az: number; alt: number } {
  // astronomy-engine의 Horizon 함수는 적경을 시(Hours) 단위(0~24)로 받습니다.
  const raHours = ra / 15.0; 
  
  // 관측자 객체 생성 (고도는 표고 0m로 가정)
  const observer = new Observer(lat, lon, 0); 
  
  // 'normal' 옵션은 기본적인 지구 대기 굴절(Refraction)을 모델링합니다.
  const hz = Horizon(date, observer, raHours, dec, 'normal');
  
  return {
    az: hz.azimuth,
    alt: hz.altitude
  };
}

/**
 * J2000.0 좌표를 관측 시점(JNow, Equator of date)의 적도 좌표로 변환합니다.
 * 배경 이미지(J2000)와 현재 별(JNow) 사이의 세차(Precession) 차이를 보정할 때 사용합니다.
 * 
 * @param ra 적경 (J2000, 단위: 도)
 * @param dec 적위 (J2000, 단위: 도)
 * @param date 관측 일시
 * @returns { ra, dec } (JNow, 단위: 도)
 */
export function j2000ToJNow(ra: number, dec: number, date: Date): { ra: number; dec: number } {
  const time = new AstroTime(date);
  
  // J2000 (EQJ) -> 관측 시점 (EQD, JNow)의 세차/장동 행렬 가져오기
  const matrix = Rotation_EQJ_EQD(time);
  
  // 1. RA/Dec(J2000)를 단위 벡터로 변환 (Cartesian)
  const raRad = ra * Math.PI / 180;
  const decRad = dec * Math.PI / 180;
  const cosDec = Math.cos(decRad);
  
  const v = new Vector(
    cosDec * Math.cos(raRad),
    cosDec * Math.sin(raRad),
    Math.sin(decRad),
    time
  );

  // 2. 세차 행렬 적용 (Rotation)
  const rotated = RotateVector(matrix, v);

  // 3. 다시 RA/Dec(JNow)로 변환
  let outRa = Math.atan2(rotated.y, rotated.x) * 180 / Math.PI;
  if (outRa < 0) outRa += 360;
  const outDec = Math.asin(Math.max(-1, Math.min(1, rotated.z))) * 180 / Math.PI;

  return { ra: outRa, dec: outDec };
}
