import * as THREE from 'three';
import { CONSTELLATIONS } from '../data/Constellations';
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

export class ConstellationLayer {
  private readonly scene: THREE.Scene;
  private readonly canvas: HTMLCanvasElement;
  private readonly linePoints: EquatorialPoint[] = [];
  private readonly lineGeometry: THREE.BufferGeometry;
  private readonly lineMaterial: THREE.ShaderMaterial;
  private readonly lineSegments: THREE.LineSegments;
  private readonly overlay: HTMLDivElement;
  private readonly labels: ConstellationLabel[] = [];
  private parentElement: HTMLElement | null = null;
  private labelsVisible = true;
  private landscapeVisible = true;
  private readonly labelFadeDurationMs = 500;

  constructor(scene: THREE.Scene, canvas: HTMLCanvasElement) {
    this.scene = scene;
    this.canvas = canvas;

    this.lineGeometry = new THREE.BufferGeometry();
    this.lineMaterial = this.createLineMaterial();
    this.overlay = document.createElement('div');
    this.overlay.setAttribute('aria-hidden', 'true');

    this.collectLinePoints();
    this.lineGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(this.linePoints.length * 3), 3)
    );

    this.lineSegments = new THREE.LineSegments(this.lineGeometry, this.lineMaterial);
    this.lineSegments.frustumCulled = false;
    this.lineSegments.renderOrder = 6;
    this.scene.add(this.lineSegments);

    this.applyOverlayStyle();
    this.mountOverlay();
    this.createLabels();
  }

  public update(lat: number, lon: number, time: Date): void {
    this.updateLines(lat, lon, time);
    this.updateLabelPositions(lat, lon, time);
  }

  public updateUniforms(fov: number, aspect: number): void {
    this.lineMaterial.uniforms.fov.value = fov;
    this.lineMaterial.uniforms.aspect.value = aspect;
  }

  public updateLabels(camera: THREE.PerspectiveCamera, cameraPitch: number): void {
    if (!this.parentElement) return;

    const rect = this.overlay.getBoundingClientRect();
    if (
      rect.width <= 0 ||
      rect.height <= 0 ||
      !Number.isFinite(camera.aspect) ||
      camera.aspect <= 0
    ) {
      this.hideAllLabels();
      return;
    }

    camera.updateMatrixWorld(true);
    this.overlay.style.display = 'block';

    const inverseQuaternion = camera.quaternion.clone().invert();
    const fovScale = 1 / Math.tan(THREE.MathUtils.degToRad(camera.fov) / 4);
    const margin = 80;
    const now = performance.now();

    for (const label of this.labels) {
      const isBelowHorizon = label.worldPosition.y < 0;

      const viewDirection = label.worldPosition.clone().applyQuaternion(inverseQuaternion).normalize();
      const fade = 1 - this.clamp((viewDirection.z - 0.5) / 0.35, 0, 1);
      const denom = 1 - viewDirection.z;
      const canProject = fade > 0.01 && denom > 0.03;
      const ndcX = canProject ? ((viewDirection.x / denom) * fovScale) / camera.aspect : 0;
      const ndcY = canProject ? (viewDirection.y / denom) * fovScale : 0;
      const screenX = canProject ? (ndcX * 0.5 + 0.5) * rect.width : label.lastScreenX;
      const screenY = canProject ? (-ndcY * 0.5 + 0.5) * rect.height : label.lastScreenY;
      const hasFinitePosition = Number.isFinite(screenX) && Number.isFinite(screenY);
      const inBounds =
        hasFinitePosition &&
        screenX >= -margin &&
        screenX <= rect.width + margin &&
        screenY >= -margin &&
        screenY <= rect.height + margin;
      const landscapeHidesLabel = this.landscapeVisible && cameraPitch >= 0 && isBelowHorizon;
      const shouldBeVisible = this.labelsVisible && !landscapeHidesLabel && canProject && inBounds;

      if (shouldBeVisible) {
        label.hiddenSince = null;
        label.lastScreenX = screenX;
        label.lastScreenY = screenY;
        label.hasScreenPosition = true;
        this.showLabel(label, screenX, screenY, fade);
        continue;
      }

      if (label.hiddenSince === null) {
        label.hiddenSince = now;
      }

      const elapsed = now - label.hiddenSince;
      if (elapsed < this.labelFadeDurationMs) {
        const fallbackX = label.hasScreenPosition ? label.lastScreenX : rect.width / 2;
        const fallbackY = label.hasScreenPosition ? label.lastScreenY : rect.height / 2;
        const hiddenX = canProject ? screenX : fallbackX;
        const hiddenY = canProject ? screenY : fallbackY;

        if (canProject && hasFinitePosition) {
          label.lastScreenX = screenX;
          label.lastScreenY = screenY;
          label.hasScreenPosition = true;
        }

        this.showLabel(label, hiddenX, hiddenY, 0);
        continue;
      }

      this.hideLabel(label);
    }
  }

  public setLinesVisible(visible: boolean): void {
    this.lineSegments.visible = visible;
  }

  public setLabelsVisible(visible: boolean): void {
    this.labelsVisible = visible;
    this.overlay.style.display = 'block';
  }

  public setLandscapeVisible(visible: boolean): void {
    this.landscapeVisible = visible;
  }

  public setVisible(visible: boolean): void {
    this.setLinesVisible(visible);
    this.setLabelsVisible(visible);
  }

  public dispose(): void {
    this.scene.remove(this.lineSegments);
    this.lineGeometry.dispose();
    this.lineMaterial.dispose();
    this.overlay.remove();
  }

  private collectLinePoints(): void {
    for (const constellation of CONSTELLATIONS) {
      for (const line of constellation.lines) {
        for (let index = 0; index < line.length - 1; index++) {
          const [startRa, startDec] = line[index];
          const [endRa, endDec] = line[index + 1];
          this.linePoints.push({ ra: startRa, dec: startDec }, { ra: endRa, dec: endDec });
        }
      }
    }
  }

  private updateLines(lat: number, lon: number, time: Date): void {
    const positions = this.lineGeometry.attributes.position.array as Float32Array;

    for (let index = 0; index < this.linePoints.length; index++) {
      const point = this.linePoints[index];
      const position = this.equatorialToWorld(point.ra, point.dec, lat, lon, time, 996);

      positions[index * 3] = position.x;
      positions[index * 3 + 1] = position.y;
      positions[index * 3 + 2] = position.z;
    }

    this.lineGeometry.attributes.position.needsUpdate = true;
  }

  private updateLabelPositions(lat: number, lon: number, time: Date): void {
    for (const label of this.labels) {
      const [ra, dec] = label.definition.label;
      const { az, alt } = calculateAzAlt(ra, dec, lat, lon, time);
      label.worldPosition.copy(this.azAltToWorld(az, alt, 997));
    }
  }

  private equatorialToWorld(
    ra: number,
    dec: number,
    lat: number,
    lon: number,
    time: Date,
    radius: number
  ): THREE.Vector3 {
    const { az, alt } = calculateAzAlt(ra, dec, lat, lon, time);
    return this.azAltToWorld(az, alt, radius);
  }

  private azAltToWorld(az: number, alt: number, radius: number): THREE.Vector3 {
    const altRad = THREE.MathUtils.degToRad(alt);
    const azRad = THREE.MathUtils.degToRad(az);

    return new THREE.Vector3(
      radius * Math.cos(altRad) * Math.sin(azRad),
      radius * Math.sin(altRad),
      -radius * Math.cos(altRad) * Math.cos(azRad)
    );
  }

  private createLineMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(0x5fa7d4) },
        opacity: { value: 0.58 },
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
          float alpha = opacity;
          float fade = 1.0 - smoothstep(0.5, 0.8, vDir.z);
          alpha *= fade;

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
    for (const definition of CONSTELLATIONS) {
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

      Object.assign(koreanName.style, {
        display: 'block',
        fontSize: '13px',
        fontWeight: '700',
        lineHeight: '1.1',
      });

      Object.assign(englishName.style, {
        display: 'block',
        marginTop: '2px',
        fontSize: '10px',
        fontWeight: '500',
        lineHeight: '1.1',
        opacity: '0.72',
      });

      root.append(koreanName, englishName);
      this.overlay.appendChild(root);
      this.labels.push({
        definition,
        root,
        worldPosition: new THREE.Vector3(),
        lastScreenX: 0,
        lastScreenY: 0,
        hasScreenPosition: false,
        hiddenSince: null,
      });
    }
  }

  private showLabel(label: ConstellationLabel, x: number, y: number, opacity: number): void {
    label.root.style.left = `${x}px`;
    label.root.style.top = `${y}px`;
    label.root.style.opacity = `${opacity * 0.82}`;
  }

  private hideLabel(label: ConstellationLabel): void {
    label.root.style.opacity = '0';
  }

  private hideAllLabels(): void {
    for (const label of this.labels) {
      this.hideLabel(label);
    }
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }
}
