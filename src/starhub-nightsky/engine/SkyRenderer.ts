import * as THREE from 'three';
import { CameraController } from './CameraController';
import { CardinalDirectionLayer } from '../layers/CardinalDirectionLayer';
import { ConstellationBoundaryLayer } from '../layers/ConstellationBoundaryLayer';
import { ConstellationLayer } from '../layers/ConstellationLayer';
import { GridLayer } from '../layers/GridLayer';
import { LandscapeLayer } from '../layers/LandscapeLayer';
import { StarLayer } from '../layers/StarLayer';
import type { ConstellationDefinition } from '../data/Constellations';
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
  constellationBoundaries: false,
};

/**
 * Three.js 렌더러와 별지도 레이어를 조율하는 내부 엔진입니다.
 * 모든 레이어의 위치 계산은 시각적 연속성을 위해 requestAnimationFrame 루프 내에서 수행됩니다.
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
  private readonly constellationBoundaryLayer: ConstellationBoundaryLayer;
  private readonly constellationLayer: ConstellationLayer;

  private observer: ObserverLocation = { lat: 37.5665, lon: 126.978 };
  private time = new Date();
  private layerVisibility: LayerVisibilityOptions = { ...DEFAULT_LAYER_VISIBILITY };
  private animationFrameId: number | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    managers: {
      catalog: any;
      lines: any;
      boundaries: any;
    },
    options: SkyRendererOptions = {}
  ) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x091220);

    const aspect = canvas.clientWidth / canvas.clientHeight;
    this.camera = new THREE.PerspectiveCamera(185, aspect, 0.1, 2000);
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
    this.constellationBoundaryLayer = new ConstellationBoundaryLayer(this.scene, managers.boundaries);
    this.constellationLayer = new ConstellationLayer(this.scene, canvas, managers.catalog, managers.lines);

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

      // 카메라 정보 추출
      const cameraDirection = new THREE.Vector3();
      this.camera.getWorldDirection(cameraDirection);
      const cameraPitch = Math.asin(cameraDirection.y);

      // 매 프레임 위치 및 유니폼 업데이트
      const { lat, lon } = this.observer;
      this.starLayer.update(lat, lon, this.time);
      this.gridLayer.update(lat, lon, this.time);
      this.constellationBoundaryLayer.update(lat, lon, this.time);
      this.constellationLayer.update(lat, lon, this.time);

      this.starLayer.updateUniforms(this.camera.fov, this.camera.aspect);
      this.constellationBoundaryLayer.updateUniforms(this.camera.fov, this.camera.aspect);
      this.constellationLayer.updateUniforms(this.camera.fov, this.camera.aspect);
      this.gridLayer.updateUniforms(this.camera.fov, this.camera.aspect);
      this.landscapeLayer.updateUniforms(this.camera.fov, this.camera.aspect, cameraPitch);

      // 렌더링
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
   * 관측 위치와 시간을 설정합니다. (루프에서 자동 반영됨)
   */
  public setObserver(observer: ObserverLocation, time = this.time): void {
    this.observer = { ...observer };
    this.time = time;
  }

  public setTime(time: Date): void {
    this.time = time;
  }

  public setFov(fov: number): void {
    this.cameraController.setFov(fov);
  }

  public setFovChangeCallback(callback: (fov: number) => void): void {
    this.cameraController.setFovCallback(callback);
  }

  public loadStars(stars: StarData[]): void {
    this.starLayer.loadStars(stars);
  }

  /**
   * 레이어 가시성을 통합 제어합니다.
   */
  public setLayerVisibility(layers: Partial<LayerVisibilityOptions>): void {
    this.layerVisibility = { ...this.layerVisibility, ...layers };
    this.gridLayer.toggleGrids(this.layerVisibility.azimuthalGrid, this.layerVisibility.equatorialGrid);
    this.landscapeLayer.setVisibility(this.layerVisibility.landscape);
    this.cardinalDirectionLayer.setVisible(this.layerVisibility.cardinalDirections);
    this.constellationBoundaryLayer.setVisible(this.layerVisibility.constellationBoundaries);
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

  public setConstellationBoundariesVisible(visible: boolean): void {
    this.setLayerVisibility({ constellationBoundaries: visible });
  }

  public setConstellationsVisible(visible: boolean): void {
    this.setLayerVisibility({
      constellationLines: visible,
      constellationLabels: visible,
      constellationBoundaries: visible,
    });
  }

  /**
   * 모든 리소스를 해제합니다.
   */
  public dispose(): void {
    this.stop();
    window.removeEventListener('resize', this.onWindowResize);
    this.cameraController.dispose();
    this.starLayer.dispose();
    this.gridLayer.dispose();
    this.landscapeLayer.dispose();
    this.constellationBoundaryLayer.dispose();
    this.constellationLayer.dispose();
    this.cardinalDirectionLayer.dispose();
    this.renderer.dispose();
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
