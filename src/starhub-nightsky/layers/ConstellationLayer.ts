import * as THREE from 'three';
import { calculateAzAlt } from '../math/CelestialMath';
import type { ConstellationDefinition } from '../data/Constellations';

interface EquatorialPoint {
  ra: number;
  dec: number;
}

interface ConstellationLabel {
  definition: ConstellationDefinition;
  root: HTMLDivElement;
  worldPosition: THREE.Vector3;
  lastScreenX: number;
  lastScreenY: number;
  hasScreenPosition: boolean;
  hiddenSince: number | null;
}

/**
 * 별자리 선과 라벨(이름)을 렌더링하는 레이어입니다.
 */
export class ConstellationLayer {
  private readonly scene: THREE.Scene;
  private readonly canvas: HTMLCanvasElement;
  private readonly linePoints: EquatorialPoint[] = [];
  private constellations: readonly ConstellationDefinition[] = [];
  private readonly lineGeometry: THREE.BufferGeometry;
  private readonly lineMaterial: THREE.ShaderMaterial;
  private readonly lineSegments: THREE.LineSegments;
  private readonly overlay: HTMLDivElement;
  private readonly labels: ConstellationLabel[] = [];
  private parentElement: HTMLElement | null = null;
  
  private labelsVisible = true;
  private linesVisible = true;
  private landscapeVisible = true;

  // 데이터 매니저
  private readonly catalogManager: any;
  private readonly linesManager: any;

  // 페이드 애니메이션 관련
  private currentOpacity = 0.0;
  private targetOpacity = 0.0;
  private readonly fadeSpeed = 0.05;
  private readonly labelFadeDurationMs = 500;

  // 로딩 상태
  private isDataLoading = false;

  constructor(scene: THREE.Scene, canvas: HTMLCanvasElement, catalogManager: any, linesManager: any) {
    this.scene = scene;
    this.canvas = canvas;
    this.catalogManager = catalogManager;
    this.linesManager = linesManager;

    this.lineGeometry = new THREE.BufferGeometry();
    this.lineMaterial = this.createLineMaterial();
    
    // 오버레이 중복 생성 방지 및 초기화
    const existingOverlay = canvas.parentElement?.querySelector('#starhub-constellation-labels');
    if (existingOverlay) {
      this.overlay = existingOverlay as HTMLDivElement;
      this.overlay.innerHTML = '';
    } else {
      this.overlay = document.createElement('div');
      this.overlay.id = 'starhub-constellation-labels';
      this.overlay.setAttribute('aria-hidden', 'true');
      this.applyOverlayStyle();
      this.mountOverlay();
    }

    this.lineSegments = new THREE.LineSegments(this.lineGeometry, this.lineMaterial);
    this.lineSegments.frustumCulled = false;
    this.lineSegments.renderOrder = 6;
    this.lineSegments.visible = false;
    this.scene.add(this.lineSegments);
  }

  /**
   * 프레임별 업데이트 (SkyRenderer의 루프에서 호출됨)
   */
  public update(lat: number, lon: number, time: Date): void {
    this.updateAnimation();
    
    // 데이터가 로드된 이후에만 좌표 계산 수행
    if (this.constellations.length > 0) {
      this.updateLines(lat, lon, time);
      this.updateLabelPositions(lat, lon, time);
    }
  }

  /**
   * 내부 데이터 로딩 (지연 로딩)
   */
  private async loadData(): Promise<void> {
    if (this.isDataLoading || this.constellations.length > 0) return;
    this.isDataLoading = true;

    try {
      const [rows, lineMap] = await Promise.all([
        this.catalogManager.load(),
        this.linesManager.load(),
      ]);
      const definitions = this.catalogManager.buildDefinitions(rows, lineMap);
      this.setConstellations(definitions);
    } catch (error) {
      console.error('Failed to load constellation data:', error);
    } finally {
      this.isDataLoading = false;
    }
  }

  public setConstellations(constellations: readonly ConstellationDefinition[]): void {
    this.constellations = [...constellations];
    this.rebuildGeometry();
    this.rebuildLabels();
  }

  /**
   * 2D 오버레이 라벨 투영 (렌더링 직후 호출됨)
   */
  public updateLabels(camera: THREE.PerspectiveCamera, cameraPitch: number): void {
    if (!this.parentElement || this.labels.length === 0) return;

    this.overlay.style.display = 'block';
    const rect = this.overlay.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    camera.updateMatrixWorld(true);
    const inverseQuaternion = camera.quaternion.clone().invert();
    const fovScale = 1 / Math.tan(THREE.MathUtils.degToRad(camera.fov) / 4);
    const margin = 80;
    const now = performance.now();

    for (const label of this.labels) {
      // worldPosition이 (0,0,0)이면 아직 한 번도 update가 안 된 것이므로 건너뜀
      if (label.worldPosition.lengthSq() < 1) continue;

      const isBelowHorizon = label.worldPosition.y < 0;
      const viewDirection = label.worldPosition.clone().applyQuaternion(inverseQuaternion).normalize();
      
      const horizonFade = 1 - this.clamp((viewDirection.z - 0.5) / 0.35, 0, 1);
      const denom = 1 - viewDirection.z;
      const canProject = horizonFade > 0.01 && denom > 0.03;
      
      const ndcX = canProject ? ((viewDirection.x / denom) * fovScale) / camera.aspect : 0;
      const ndcY = canProject ? (viewDirection.y / denom) * fovScale : 0;
      const screenX = (ndcX * 0.5 + 0.5) * rect.width;
      const screenY = (-ndcY * 0.5 + 0.5) * rect.height;

      const inBounds = canProject &&
        screenX >= -margin && screenX <= rect.width + margin &&
        screenY >= -margin && screenY <= rect.height + margin;

      const landscapeHidesLabel = this.landscapeVisible && cameraPitch >= 0 && isBelowHorizon;
      const shouldBeVisible = this.labelsVisible && !landscapeHidesLabel && inBounds;

      if (shouldBeVisible) {
        label.hiddenSince = null;
        label.lastScreenX = screenX;
        label.lastScreenY = screenY;
        label.hasScreenPosition = true;
        this.showLabel(label, screenX, screenY, horizonFade);
      } else {
        if (label.hiddenSince === null) label.hiddenSince = now;
        const elapsed = now - label.hiddenSince;
        if (elapsed < this.labelFadeDurationMs && label.hasScreenPosition) {
          this.showLabel(label, label.lastScreenX, label.lastScreenY, 0);
        } else {
          this.hideLabel(label);
        }
      }
    }
  }

  public updateUniforms(fov: number, aspect: number): void {
    this.lineMaterial.uniforms.fov.value = fov;
    this.lineMaterial.uniforms.aspect.value = aspect;
  }

  public setLinesVisible(visible: boolean): void {
    this.linesVisible = visible;
    this.targetOpacity = visible ? 0.8 : 0.0;
    if (visible) this.loadData();
  }

  public setLabelsVisible(visible: boolean): void {
    this.labelsVisible = visible;
    if (visible) this.loadData();
  }

  public setLandscapeVisible(visible: boolean): void {
    this.landscapeVisible = visible;
  }

  public dispose(): void {
    this.scene.remove(this.lineSegments);
    this.lineGeometry.dispose();
    this.lineMaterial.dispose();
    const overlay = document.getElementById('starhub-constellation-labels');
    if (overlay) overlay.remove();
    this.labels.length = 0;
  }

  private updateAnimation(): void {
    const diff = this.targetOpacity - this.currentOpacity;
    if (Math.abs(diff) > 0.001) {
      this.currentOpacity += Math.sign(diff) * Math.min(Math.abs(diff), this.fadeSpeed);
      this.lineMaterial.uniforms.opacity.value = this.currentOpacity;
      
      if (this.currentOpacity > 0 && !this.lineSegments.visible) {
        this.lineSegments.visible = true;
      }
    } else {
      this.currentOpacity = this.targetOpacity;
      this.lineMaterial.uniforms.opacity.value = this.targetOpacity;
      if (this.currentOpacity <= 0) {
        this.lineSegments.visible = false;
      }
    }
  }

  private rebuildGeometry(): void {
    this.linePoints.length = 0;
    for (const constellation of this.constellations) {
      for (const line of constellation.lines) {
        for (let i = 0; i < line.length - 1; i++) {
          const [sRa, sDec] = line[i];
          const [eRa, eDec] = line[i + 1];
          this.linePoints.push({ ra: sRa, dec: sDec }, { ra: eRa, dec: eDec });
        }
      }
    }

    if (this.linePoints.length === 0) return;

    // 지오메트리 속성 강제 갱신
    this.lineGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(this.linePoints.length * 3), 3)
    );
  }

  private updateLines(lat: number, lon: number, time: Date): void {
    if (!this.lineSegments.visible || this.linePoints.length === 0) return;
    
    const attr = this.lineGeometry.attributes.position;
    const positions = attr.array as Float32Array;
    if (positions.length < this.linePoints.length * 3) return;

    for (let i = 0; i < this.linePoints.length; i++) {
      const point = this.linePoints[i];
      const pos = this.equatorialToWorld(point.ra, point.dec, lat, lon, time, 996);
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;
    }
    attr.needsUpdate = true;
  }

  private updateLabelPositions(lat: number, lon: number, time: Date): void {
    for (const label of this.labels) {
      const [ra, dec] = label.definition.label;
      const { az, alt } = calculateAzAlt(ra, dec, lat, lon, time);
      label.worldPosition.copy(this.azAltToWorld(az, alt, 997));
    }
  }

  private equatorialToWorld(ra: number, dec: number, lat: number, lon: number, time: Date, r: number): THREE.Vector3 {
    const { az, alt } = calculateAzAlt(ra, dec, lat, lon, time);
    return this.azAltToWorld(az, alt, r);
  }

  private azAltToWorld(az: number, alt: number, r: number): THREE.Vector3 {
    const altRad = THREE.MathUtils.degToRad(alt);
    const azRad = THREE.MathUtils.degToRad(az);
    return new THREE.Vector3(
      r * Math.cos(altRad) * Math.sin(azRad),
      r * Math.sin(altRad),
      -r * Math.cos(altRad) * Math.cos(azRad)
    );
  }

  private createLineMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(0x5fa7d4) },
        opacity: { value: 0.0 },
        fov: { value: 60.0 },
        aspect: { value: 1.0 },
      },
      vertexShader: `
        uniform float fov;
        uniform float aspect;
        varying vec3 vDir;
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vec3 dir = normalize(mvPosition.xyz);
          vDir = dir;
          float fovRad = radians(fov);
          float scale = 1.0 / tan(fovRad / 4.0);
          vec2 proj = vec2(dir.x, dir.y) / (1.0 - dir.z) * scale;
          gl_Position = vec4(proj.x / aspect, proj.y, -dir.z * 0.001, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform float opacity;
        varying vec3 vDir;
        void main() {
          float fade = 1.0 - smoothstep(0.5, 0.8, vDir.z);
          float alpha = opacity * fade;
          if (alpha < 0.01) discard;
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
    });
  }

  private mountOverlay(): void {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    this.parentElement = parent;
    if (window.getComputedStyle(parent).position === 'static') {
      parent.style.position = 'relative';
    }
    parent.appendChild(this.overlay);
  }

  private applyOverlayStyle(): void {
    Object.assign(this.overlay.style, {
      position: 'absolute',
      inset: '0',
      pointerEvents: 'none',
      zIndex: '10',
      overflow: 'hidden',
    });
  }

  private createLabels(): void {
    for (const definition of this.constellations) {
      const root = document.createElement('div');
      const koreanName = document.createElement('span');
      const englishName = document.createElement('span');
      koreanName.textContent = definition.koreanName;
      englishName.textContent = definition.englishName;

      Object.assign(root.style, {
        position: 'absolute',
        display: 'block',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
        color: 'rgba(168, 218, 230, 0.78)',
        textShadow: '0 0 3px rgba(0, 0, 0, 0.95), 0 0 12px rgba(40, 120, 160, 0.55)',
        letterSpacing: '0',
        whiteSpace: 'nowrap',
        userSelect: 'none',
        opacity: '0',
        transition: 'opacity 0.5s ease',
        willChange: 'opacity',
      });

      Object.assign(koreanName.style, { display: 'block', fontSize: '13px', fontWeight: '700', lineHeight: '1.1' });
      Object.assign(englishName.style, { display: 'block', marginTop: '2px', fontSize: '10px', fontWeight: '500', lineHeight: '1.1', opacity: '0.72' });

      root.append(koreanName, englishName);
      this.overlay.appendChild(root);
      this.labels.push({
        definition, root, worldPosition: new THREE.Vector3(),
        lastScreenX: 0, lastScreenY: 0, hasScreenPosition: false, hiddenSince: null,
      });
    }
  }

  private rebuildLabels(): void {
    for (const label of this.labels) label.root.remove();
    this.labels.length = 0;
    this.createLabels();
  }

  private showLabel(label: ConstellationLabel, x: number, y: number, opacity: number): void {
    label.root.style.left = `${x}px`;
    label.root.style.top = `${y}px`;
    label.root.style.opacity = `${opacity * 0.82}`;
  }

  private hideLabel(label: ConstellationLabel): void {
    label.root.style.opacity = '0';
  }

  private clamp(v: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, v));
  }
}
