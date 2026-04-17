export interface ObserverLocation {
  lat: number;
  lon: number;
}

export interface StarData {
  ra: number;
  dec: number;
  mag: number;
  name?: string;
  altName?: string;
}

export interface LayerVisibilityOptions {
  azimuthalGrid: boolean;
  equatorialGrid: boolean;
  landscape: boolean;
  cardinalDirections: boolean;
  constellationLines: boolean;
  constellationLabels: boolean;
  constellationBoundaries: boolean;
  skymap: boolean;
}

export interface StarhubNightskyOptions {
  observer?: ObserverLocation;
  time?: Date;
  fov?: number;
  layers?: Partial<LayerVisibilityOptions>;
  pixelRatio?: number;
  /**
   * 별지도에서 사용하는 정적 자산(CSV 등)의 베이스 경로입니다.
   * 기본값은 '/assets/data' 입니다.
   */
  assetPath?: string;
}

export type FovChangeCallback = (fov: number) => void;
