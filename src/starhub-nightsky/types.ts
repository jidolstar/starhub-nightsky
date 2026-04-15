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
}

export interface StarhubNightskyOptions {
  observer?: ObserverLocation;
  time?: Date;
  fov?: number;
  layers?: Partial<LayerVisibilityOptions>;
  pixelRatio?: number;
}

export type FovChangeCallback = (fov: number) => void;
