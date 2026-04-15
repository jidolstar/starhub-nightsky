import { parseBrightStarCatalogCsv } from './catalog/StarCatalog';
import { loadBundledStarCatalogCsvText } from './catalog/DefaultStarCatalog';
import { SkyRenderer } from './engine/SkyRenderer';
import type {
  FovChangeCallback,
  LayerVisibilityOptions,
  ObserverLocation,
  StarData,
  StarhubNightskyOptions,
} from './types';

const DEFAULT_OBSERVER: ObserverLocation = {
  lat: 37.5665,
  lon: 126.978,
};

/**
 * Starhub Night Sky 라이브러리의 대표 클래스입니다.
 * 앱 프레임워크는 이 클래스의 public API만 사용하고, 내부 렌더링 구조에는 의존하지 않습니다.
 */
export class StarhubNightsky {
  private readonly renderer: SkyRenderer;
  private observer: ObserverLocation;
  private time: Date;
  private disposed = false;

  constructor(canvas: HTMLCanvasElement, options: StarhubNightskyOptions = {}) {
    this.observer = options.observer ? { ...options.observer } : { ...DEFAULT_OBSERVER };
    this.time = options.time ?? new Date();

    this.renderer = new SkyRenderer(canvas, {
      layers: options.layers,
      pixelRatio: options.pixelRatio,
    });

    this.renderer.setObserver(this.observer, this.time);
    if (typeof options.fov === 'number') {
      this.renderer.setFov(options.fov);
    }
  }

  /**
   * 렌더 루프를 시작합니다.
   */
  public start(): void {
    this.renderer.start();
  }

  /**
   * 렌더 루프를 멈춥니다.
   */
  public stop(): void {
    this.renderer.stop();
  }

  /**
   * 관측 위치와 시간을 함께 갱신합니다.
   */
  public setObserver(observer: ObserverLocation, time = this.time): void {
    this.observer = { ...observer };
    this.time = time;
    this.renderer.setObserver(this.observer, this.time);
  }

  /**
   * 관측 위치만 갱신합니다.
   */
  public setLocation(lat: number, lon: number): void {
    this.setObserver({ lat, lon });
  }

  /**
   * 관측 시간만 갱신합니다.
   */
  public setTime(time: Date): void {
    this.time = time;
    this.renderer.setTime(time);
  }

  /**
   * 카메라 시야각을 변경합니다.
   */
  public setFov(fov: number): void {
    this.renderer.setFov(fov);
  }

  /**
   * 사용자의 휠 조작으로 시야각이 바뀔 때 호출될 콜백을 등록합니다.
   */
  public setFovChangeCallback(callback: FovChangeCallback): void {
    this.renderer.setFovChangeCallback(callback);
  }

  /**
   * 실제 별 데이터를 별지도에 반영합니다.
   */
  public loadStars(stars: StarData[]): void {
    if (this.disposed) return;
    this.renderer.loadStars(stars);
  }

  /**
   * 라이브러리에 포함된 기본 Bright Star Catalog를 불러와 별지도에 반영합니다.
   */
  public async loadDefaultStarCatalog(): Promise<StarData[]> {
    if (this.disposed) return [];

    const csvText = await loadBundledStarCatalogCsvText();
    const stars = this.loadStarCatalogFromCsvText(csvText);

    if (!this.disposed) {
      this.loadStars(stars);
    }

    return stars;
  }

  /**
   * CSV URL에서 Bright Star Catalog 데이터를 불러와 별지도에 반영합니다.
   */
  public async loadStarCatalogFromUrl(url: string, init?: RequestInit): Promise<StarData[]> {
    const response = await fetch(url, init);
    if (!response.ok) {
      throw new Error(`Star catalog fetch failed: ${response.status}`);
    }

    const csvText = await response.text();
    const stars = this.loadStarCatalogFromCsvText(csvText);
    if (!this.disposed) {
      this.loadStars(stars);
    }

    return stars;
  }

  /**
   * 개발 확인용 임시 별 데이터를 생성합니다.
   */
  public loadMockStars(count = 2000): void {
    if (this.disposed) return;
    this.renderer.loadMockStars(count);
  }

  /**
   * 여러 레이어 표시 상태를 한 번에 갱신합니다.
   */
  public setLayerVisibility(layers: Partial<LayerVisibilityOptions>): void {
    this.renderer.setLayerVisibility(layers);
  }

  public setAzimuthalGridVisible(visible: boolean): void {
    this.renderer.setAzimuthalGridVisible(visible);
  }

  public setEquatorialGridVisible(visible: boolean): void {
    this.renderer.setEquatorialGridVisible(visible);
  }

  public setLandscapeVisible(visible: boolean): void {
    this.renderer.setLandscapeVisible(visible);
  }

  public setCardinalDirectionsVisible(visible: boolean): void {
    this.renderer.setCardinalDirectionsVisible(visible);
  }

  public setConstellationLinesVisible(visible: boolean): void {
    this.renderer.setConstellationLinesVisible(visible);
  }

  public setConstellationLabelsVisible(visible: boolean): void {
    this.renderer.setConstellationLabelsVisible(visible);
  }

  public setConstellationsVisible(visible: boolean): void {
    this.renderer.setConstellationsVisible(visible);
  }

  /**
   * 렌더링 리소스와 이벤트 리스너를 정리합니다.
   */
  public dispose(): void {
    this.disposed = true;
    this.renderer.dispose();
  }

  private loadStarCatalogFromCsvText(csvText: string): StarData[] {
    const stars = parseBrightStarCatalogCsv(csvText);
    if (!stars.length) {
      throw new Error('Parsed star catalog is empty');
    }

    return stars;
  }
}
