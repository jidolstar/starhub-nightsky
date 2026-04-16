import * as THREE from 'three';
import { type ConstellationBoundaryDefinition } from '../data/ConstellationBoundaries';
import { calculateAzAlt } from '../math/CelestialMath';

interface EquatorialPoint {
  ra: number;
  dec: number;
}

/**
 * IAU 공식 별자리 경계선을 렌더링하는 레이어입니다.
 * 별자리선보다 약하게, 격자보다 앞에 보이도록 배치합니다.
 */
export class ConstellationBoundaryLayer {
  private readonly scene: THREE.Scene;
  private readonly boundaries: ConstellationBoundaryDefinition[] = [];
  private linePoints: EquatorialPoint[] = [];
  private readonly lineGeometry: THREE.BufferGeometry;
  private readonly lineMaterial: THREE.ShaderMaterial;
  private readonly lineSegments: THREE.LineSegments;

  // 데이터 매니저 및 상태
  private readonly boundariesManager: any;
  private isDataLoading = false;
  private boundariesVisible = false;

  // 페이드 애니메이션 관련
  private currentOpacity = 0.0;
  private targetOpacity = 0.0;
  private readonly fadeSpeed = 0.03;

  constructor(scene: THREE.Scene, boundariesManager: any) {
    this.scene = scene;
    this.boundariesManager = boundariesManager;

    this.lineGeometry = new THREE.BufferGeometry();
    this.lineMaterial = this.createLineMaterial();

    this.lineSegments = new THREE.LineSegments(this.lineGeometry, this.lineMaterial);
    this.lineSegments.frustumCulled = false;
    this.lineSegments.renderOrder = 5;
    this.lineSegments.visible = false;
    this.scene.add(this.lineSegments);
  }

  /**
   * 프레임별 업데이트를 수행합니다.
   */
  public update(lat: number, lon: number, time: Date): void {
    this.updateAnimation();
    if (this.linePoints.length === 0 || !this.lineSegments.visible) return;
    this.updateLines(lat, lon, time);
  }

  /**
   * 렌더러의 유니폼 변수를 업데이트합니다.
   */
  public updateUniforms(fov: number, aspect: number): void {
    this.lineMaterial.uniforms.fov.value = fov;
    this.lineMaterial.uniforms.aspect.value = aspect;
  }

  /**
   * 경계선 가시성을 부드럽게 전환합니다.
   */
  public setVisible(visible: boolean): void {
    this.boundariesVisible = visible;
    this.targetOpacity = visible ? 0.4 : 0.0;

    if (visible) {
      this.loadData();
      if (this.linePoints.length > 0) {
        this.lineSegments.visible = true;
      }
    }
  }

  /**
   * 데이터를 비동기로 로드합니다.
   */
  private async loadData(): Promise<void> {
    if (this.isDataLoading || this.boundaries.length > 0) return;
    this.isDataLoading = true;

    try {
      const data = await this.boundariesManager.load();
      this.setBoundaries(data);
      
      // 데이터 로드 완료 후 현재 가시성 상태 반영
      if (this.boundariesVisible) {
        this.setVisible(true);
      }
    } catch (error) {
      console.error('Failed to load constellation boundaries:', error);
    } finally {
      this.isDataLoading = false;
    }
  }

  /**
   * 로드된 경계선 데이터를 주입하고 지오메트리를 생성합니다.
   */
  public setBoundaries(boundaries: ConstellationBoundaryDefinition[]): void {
    this.boundaries.length = 0;
    this.boundaries.push(...boundaries);
    
    this.linePoints = [];
    for (const boundary of this.boundaries) {
      for (const loop of boundary.loops) {
        if (loop.length < 2) continue;
        for (let i = 0; i < loop.length; i++) {
          const start = loop[i];
          const end = loop[(i + 1) % loop.length];
          this.linePoints.push({ ra: start[0], dec: start[1] }, { ra: end[0], dec: end[1] });
        }
      }
    }

    this.rebuildGeometry();
  }

  /**
   * 리소스를 해제합니다.
   */
  public dispose(): void {
    this.scene.remove(this.lineSegments);
    this.lineGeometry.dispose();
    this.lineMaterial.dispose();
    this.lineSegments.visible = false;
  }

  private rebuildGeometry(): void {
    if (this.linePoints.length === 0) return;
    
    this.lineGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(this.linePoints.length * 3), 3)
    );
  }

  private updateAnimation(): void {
    // 데이터 로드 전에는 애니메이션 보류
    if (this.linePoints.length === 0 && this.targetOpacity > 0) return;

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

  private updateLines(lat: number, lon: number, time: Date): void {
    const positions = this.lineGeometry.attributes.position.array as Float32Array;
    if (positions.length < this.linePoints.length * 3) return;

    for (let i = 0; i < this.linePoints.length; i++) {
      const point = this.linePoints[i];
      const pos = this.equatorialToWorld(point.ra, point.dec, lat, lon, time, 994.5);
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;
    }
    this.lineGeometry.attributes.position.needsUpdate = true;
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
        color: { value: new THREE.Color(0x8dcfb0) },
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
}
