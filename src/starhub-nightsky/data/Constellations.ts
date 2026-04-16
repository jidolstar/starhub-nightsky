// 별자리 좌표 데이터는 d3-celestial GeoJSON 데이터를 내부 렌더링 포맷으로 변환한 것입니다.
// Korean names follow the KASI/IAU 88 constellation naming convention.

export type ConstellationPoint = readonly [ra: number, dec: number];

export interface ConstellationDefinition {
  id: string;
  koreanName: string;
  englishName: string;
  label: ConstellationPoint;
  lines: readonly (readonly ConstellationPoint[])[];
}

/**
 * 별자리 정의 목록.
 * 이제 좌표 데이터(lines)는 외부 CSV 파일에서 동적으로 로드되므로 여기서는 빈 배열로 초기화하거나
 * 카탈로그에서 로드된 데이터로 채워지게 됩니다.
 */
export const CONSTELLATIONS = [] as const satisfies readonly ConstellationDefinition[];
