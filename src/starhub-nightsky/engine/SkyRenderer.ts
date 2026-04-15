import * as THREE from 'three';
import { CameraController } from './CameraController';
import { CardinalDirectionLayer } from '../layers/CardinalDirectionLayer';
import { ConstellationLayer } from '../layers/ConstellationLayer';
import { GridLayer } from '../layers/GridLayer';
import { LandscapeLayer } from '../layers/LandscapeLayer';
import { StarLayer } from '../layers/StarLayer';
import type { LayerVisibilityOptions, ObserverLocation, StarData } from '../types';

interface SkyRendererOptions {
  layers?: Partial<LayerVisibilityOptions>;
  pixelRatio?: number;
}

const DEFAULT_LAYER_VISIBILITY: LayerVisibilityOptions = {
  azimuthalGrid: false,
  equatorialGrid: true,
  landscape: true,
  cardinalDirections: true,
  constellationLines: true,
  constellationLabels: true,
};

/**
 * Three.js 렌더러와 별지도 레이어를 조율하는 내부 엔진입니다.
 * 외부 앱은 이 클래스 대신 StarhubNightsky 대표 클래스를 사용합니다.
 */
export class SkyRenderer {
  public readonly scene: THREE.Scene;
  public readonly camera: THREE.PerspectiveCamera;
  public readonly renderer: THREE.WebGLRenderer;

  private readonly cameraController: CameraController;
  private readonly starLayer: StarLayer;
  private readonly gridLayer: GridLayer;
  private readonly landscapeLayer: LandscapeLayer;
  private readonly cardinalDirectionLayer: CardinalDirectionLayer;
  private readonly constellationLayer: ConstellationLayer;

  private observer: ObserverLocation = { lat: 37.5665, lon: 126.978 };
  private time = new Date();
  private layerVisibility: LayerVisibilityOptions = { ...DEFAULT_LAYER_VISIBILITY };
  private animationFrameId: number | null = null;

  constructor(canvas: HTMLCanvasElement, options: SkyRendererOptions = {}) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x091220);

    const aspect = canvas.clientWidth / canvas.clientHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 2000);
    this.camera.position.set(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.renderer.setPixelRatio(options.pixelRatio ?? window.devicePixelRatio);
    this.renderer.domElement.style.touchAction = 'none';

    this.cameraController = new CameraController(this.camera, this.renderer.domElement);
    this.starLayer = new StarLayer(this.scene);
    this.gridLayer = new GridLayer(this.scene);
    this.landscapeLayer = new LandscapeLayer(this.scene);
    this.cardinalDirectionLayer = new CardinalDirectionLayer(canvas);
    this.constellationLayer = new ConstellationLayer(this.scene, canvas);

    this.setLayerVisibility(options.layers ?? {});
    window.addEventListener('resize', this.onWindowResize);
  }

  /**
   * 렌더 루프를 시작합니다.
   */
  public start(): void {
    if (this.animationFrameId !== null) return;

    const loop = () => {
      this.animationFrameId = requestAnimationFrame(loop);

      const cameraDirection = new THREE.Vector3();
      this.camera.getWorldDirection(cameraDirection);
      const cameraPitch = Math.asin(cameraDirection.y);

      this.starLayer.updateUniforms(this.camera.fov, this.camera.aspect);
      this.constellationLayer.updateUniforms(this.camera.fov, this.camera.aspect);
      this.gridLayer.updateUniforms(this.camera.fov, this.camera.aspect);
      this.landscapeLayer.updateUniforms(this.camera.fov, this.camera.aspect, cameraPitch);

      this.renderer.render(this.scene, this.camera);
      this.constellationLayer.updateLabels(this.camera, cameraPitch);
      this.cardinalDirectionLayer.update(this.camera);
    };

    loop();
  }

  /**
   * 렌더 루프를 멈춥니다.
   */
  public stop(): void {
    if (this.animationFrameId === null) return;

    cancelAnimationFrame(this.animationFrameId);
    this.animationFrameId = null;
  }

  /**
   * 관측 위치와 시간을 갱신합니다.
   */
  public setObserver(observer: ObserverLocation, time = this.time): void {
    this.observer = { ...observer };
    this.time = time;
    this.updateCelestialLayers();
  }

  /**
   * 관측 시간만 갱신합니다.
   */
  public setTime(time: Date): void {
    this.time = time;
    this.updateCelestialLayers();
  }

  /**
   * 카메라 시야각을 변경합니다.
   */
  public setFov(fov: number): void {
    this.cameraController.setFov(fov);
  }

  /**
   * 휠 조작으로 시야각이 바뀔 때 호출할 콜백을 등록합니다.
   */
  public setFovChangeCallback(callback: (fov: number) => void): void {
    this.cameraController.setFovCallback(callback);
  }

  /**
   * 실제 별 데이터를 별 레이어에 반영합니다.
   */
  public loadStars(stars: StarData[]): void {
    this.starLayer.loadStars(stars);
    this.starLayer.update(this.observer.lat, this.observer.lon, this.time);
  }

  /**
   * 개발용 임시 별 데이터를 생성합니다.
   */
  public loadMockStars(count = 2000): void {
    this.starLayer.loadMockStars(count);
    this.starLayer.update(this.observer.lat, this.observer.lon, this.time);
  }

  /**
   * 여러 레이어의 표시 상태를 한 번에 갱신합니다.
   */
  public setLayerVisibility(layers: Partial<LayerVisibilityOptions>): void {
    this.layerVisibility = { ...this.layerVisibility, ...layers };
    this.gridLayer.toggleGrids(this.layerVisibility.azimuthalGrid, this.layerVisibility.equatorialGrid);
    this.landscapeLayer.setVisibility(this.layerVisibility.landscape);
    this.cardinalDirectionLayer.setVisible(this.layerVisibility.cardinalDirections);
    this.constellationLayer.setLandscapeVisible(this.layerVisibility.landscape);
    this.constellationLayer.setLinesVisible(this.layerVisibility.constellationLines);
    this.constellationLayer.setLabelsVisible(this.layerVisibility.constellationLabels);
  }

  public setAzimuthalGridVisible(visible: boolean): void {
    this.setLayerVisibility({ azimuthalGrid: visible });
  }

  public setEquatorialGridVisible(visible: boolean): void {
    this.setLayerVisibility({ equatorialGrid: visible });
  }

  public setLandscapeVisible(visible: boolean): void {
    this.setLayerVisibility({ landscape: visible });
  }

  public setCardinalDirectionsVisible(visible: boolean): void {
    this.setLayerVisibility({ cardinalDirections: visible });
  }

  public setConstellationLinesVisible(visible: boolean): void {
    this.setLayerVisibility({ constellationLines: visible });
  }

  public setConstellationLabelsVisible(visible: boolean): void {
    this.setLayerVisibility({ constellationLabels: visible });
  }

  public setConstellationsVisible(visible: boolean): void {
    this.setLayerVisibility({
      constellationLines: visible,
      constellationLabels: visible,
    });
  }

  /**
   * WebGL, 이벤트 리스너, 내부 레이어 리소스를 정리합니다.
   */
  public dispose(): void {
    this.stop();
    window.removeEventListener('resize', this.onWindowResize);
    this.cameraController.dispose();
    this.starLayer.dispose();
    this.gridLayer.dispose();
    this.landscapeLayer.dispose();
    this.constellationLayer.dispose();
    this.cardinalDirectionLayer.dispose();
    this.renderer.dispose();
  }

  private updateCelestialLayers(): void {
    this.starLayer.update(this.observer.lat, this.observer.lon, this.time);
    this.constellationLayer.update(this.observer.lat, this.observer.lon, this.time);
    this.gridLayer.update(this.observer.lat, this.observer.lon, this.time);
  }

  private onWindowResize = (): void => {
    const canvas = this.renderer.domElement;
    const parent = canvas.parentElement;
    if (!parent) return;

    this.camera.aspect = parent.clientWidth / parent.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(parent.clientWidth, parent.clientHeight);
  };
}
