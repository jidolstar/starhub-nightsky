import { ConstellationCatalog } from './data/ConstellationCatalog';
import { ConstellationLines } from './data/ConstellationLines';
import { ConstellationBoundaries } from './data/ConstellationBoundaries';
import { StarCatalogManager } from './data/StarCatalogManager';
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

const DEFAULT_ASSET_PATH = '/assets/data/';

/**
 * Starhub Night Sky 라이브러리의 대표 클래스입니다.
 * 앱 프레임워크는 이 클래스의 public API만 사용하고, 내부 렌더링 구조에는 의존하지 않습니다.
 */
export class StarhubNightsky {
  private readonly renderer: SkyRenderer;
  private observer: ObserverLocation;
  private time: Date;
  private disposed = false;

  // 데이터 도메인 매니저들
  private readonly starCatalogManager: StarCatalogManager;
  private readonly catalogManager: ConstellationCatalog;
  private readonly linesManager: ConstellationLines;
  private readonly boundariesManager: ConstellationBoundaries;

  constructor(canvas: HTMLCanvasElement, options: StarhubNightskyOptions = {}) {
    this.observer = options.observer ? { ...options.observer } : { ...DEFAULT_OBSERVER };
    this.time = options.time ?? new Date();

    const assetPath = options.assetPath ?? DEFAULT_ASSET_PATH;
    this.starCatalogManager = new StarCatalogManager(assetPath);
    this.catalogManager = new ConstellationCatalog(assetPath);
    this.linesManager = new ConstellationLines(assetPath);
    this.boundariesManager = new ConstellationBoundaries(assetPath);

    this.renderer = new SkyRenderer(
      canvas,
      {
        catalog: this.catalogManager,
        lines: this.linesManager,
        boundaries: this.boundariesManager,
      },
      {
        layers: options.layers,
        pixelRatio: options.pixelRatio,
      }
    );

    this.renderer.setObserver(this.observer, this.time);
    
    // 시야각 초기화 (기본값 185도)
    const initialFov = typeof options.fov === 'number' ? options.fov : 185;
    this.renderer.setFov(initialFov);
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
   * 별 데이터를 별지도에 반영합니다.
   */
  public loadStars(stars: StarData[]): void {
    if (this.disposed) return;
    this.renderer.loadStars(stars);
  }

  /**
   * 자산 경로에서 기본 별 카탈로그(BSC5)를 불러와 별지도에 반영합니다.
   */
  public async loadDefaultStarCatalog(): Promise<StarData[]> {
    if (this.disposed) return [];

    try {
      const stars = await this.starCatalogManager.load();
      if (!this.disposed) {
        this.loadStars(stars);
      }
      return stars;
    } catch (error) {
      console.error('Failed to load star catalog:', error);
      throw error;
    }
  }

  /**
   * 여러 레이어 표시 상태를 한 번에 갱신합니다.
   */
  public setLayerVisibility(layers: Partial<LayerVisibilityOptions>): void {
    this.renderer.setLayerVisibility(layers);
  }

  public setAzimuthalGridVisible(boolean: boolean): void {
    this.renderer.setAzimuthalGridVisible(boolean);
  }

  public setEquatorialGridVisible(boolean: boolean): void {
    this.renderer.setEquatorialGridVisible(boolean);
  }

  public setLandscapeVisible(boolean: boolean): void {
    this.renderer.setLandscapeVisible(boolean);
  }

  public setCardinalDirectionsVisible(boolean: boolean): void {
    this.renderer.setCardinalDirectionsVisible(boolean);
  }

  public setConstellationLinesVisible(visible: boolean): void {
    this.renderer.setConstellationLinesVisible(visible);
  }

  public setConstellationLabelsVisible(visible: boolean): void {
    this.renderer.setConstellationLabelsVisible(visible);
  }

  public setConstellationBoundariesVisible(visible: boolean): void {
    this.renderer.setConstellationBoundariesVisible(visible);
  }

  /**
   * 렌더링 리소스와 이벤트 리스너를 정리합니다.
   */
  public dispose(): void {
    this.disposed = true;
    this.renderer.dispose();
  }
}
