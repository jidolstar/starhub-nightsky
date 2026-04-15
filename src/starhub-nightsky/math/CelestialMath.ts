import { Horizon, Observer } from 'astronomy-engine';

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
