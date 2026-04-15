import * as THREE from 'three';
import { calculateAzAlt } from '../math/CelestialMath';
import type { StarData } from '../types';

/**
 * 수만 개의 별 데이터를 화면에 효율적으로 렌더링하는 시스템 매니저.
 * 천구 좌표계를 투영 모드에 맞춰 계산하고 크기 및 반짝임을 제어하는 역할을 합니다.
 */
export class StarLayer {
  private scene: THREE.Scene;
  
  private starsGeometry: THREE.BufferGeometry | null = null;
  private starsMaterial: THREE.ShaderMaterial | null = null;
  private starsPoints: THREE.Points | null = null;
  
  private starsData: StarData[] = [];

  /**
   * StarManager 인스턴스를 생성합니다.
   * @param scene 별 포인트를 추가할 대상 씬 객체
   */
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initStarsMaterial();
  }

  /**
   * 항성 데이터를 생성하고 3D 지오메트리 점(Points)으로 초기화합니다.
   * @param count 렌더링할 모의 항성의 개수
   */
  public loadStars(stars: StarData[]) {
    this.starsData = [...stars];
    this.createStarsMesh();
  }

  public loadMockStars(count: number = 2000) {
    const stars: StarData[] = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        ra: Math.random() * 360,
        dec: Math.random() * 180 - 90,
        mag: Math.random() * 7 - 1.5 // -1.5 to 5.5
      });
    }
    this.loadStars(stars);
  }

  private initStarsMaterial() {
    const vertexShader = `
      attribute float magnitude;
      varying float vMagnitude;
      varying vec3 vDir;
      uniform float fov;
      uniform float aspect;

      void main() {
        vMagnitude = clamp(1.0 - (magnitude + 1.5) / 8.0, 0.0, 1.0);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vec3 dir = normalize(mvPosition.xyz);
        vDir = dir;
        
        float fovRad = radians(fov);
        float scale = 1.0 / tan(fovRad / 4.0);
        vec2 proj = vec2(dir.x, dir.y) / (1.0 - dir.z) * scale;
        
        gl_PointSize = clamp((7.5 - magnitude) * 2.0, 3.5, 18.0);
        gl_Position = vec4(proj.x / aspect, proj.y, -dir.z * 0.001, 1.0);
      }
    `;

    const fragmentShader = `
      varying float vMagnitude;
      varying vec3 vDir;
      
      void main() {
        vec2 uv = gl_PointCoord.xy - vec2(0.5);
        float dist = length(uv);

        float core = smoothstep(0.18, 0.0, dist);
        float halo = smoothstep(0.5, 0.08, dist);

        float alpha = core * (0.75 + vMagnitude * 0.25) + halo * (0.45 + vMagnitude * 0.75);
        alpha *= 0.85;

        float fade = 1.0 - smoothstep(0.5, 0.8, vDir.z);
        alpha *= fade;

        if (alpha < 0.01) discard;
        vec3 color = mix(vec3(0.92, 0.96, 1.0), vec3(1.0, 0.97, 0.88), vMagnitude);
        gl_FragColor = vec4(color, alpha);
      }
    `;

    this.starsMaterial = new THREE.ShaderMaterial({
      uniforms: {
        fov: { value: 60.0 },
        aspect: { value: 1.0 }
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
  }

  private createStarsMesh() {
    if (this.starsPoints) {
      this.scene.remove(this.starsPoints);
      this.starsGeometry?.dispose();
    }

    this.starsGeometry = new THREE.BufferGeometry();
    
    const positions = new Float32Array(this.starsData.length * 3);
    const magnitudes = new Float32Array(this.starsData.length);

    for (let i = 0; i < this.starsData.length; i++) {
      magnitudes[i] = this.starsData[i].mag;
    }

    this.starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.starsGeometry.setAttribute('magnitude', new THREE.BufferAttribute(magnitudes, 1));

    this.starsPoints = new THREE.Points(this.starsGeometry, this.starsMaterial!);
    this.starsPoints.renderOrder = 20;
    this.scene.add(this.starsPoints);
  }

  /**
   * 카메라 정보를 렌더러 루프마다 별 셰이더의 파라미터(Uniform)로 업데이트합니다.
   * @param fov 카메라 줌을 대변하는 Field of view 각도
   * @param aspect 가로 대비 세로비율
   */
  public updateUniforms(fov: number, aspect: number) {
    if (this.starsMaterial) {
      this.starsMaterial.uniforms.fov.value = fov;
      this.starsMaterial.uniforms.aspect.value = aspect;
    }
  }

  /**
   * 관측 위치와 시간에 따라 별의 방위각과 고도를 계산하여 위치를 업데이트합니다.
   * @param lat 위도
   * @param lon 경도
   * @param time 관측 시간
   */
  public update(lat: number, lon: number, time: Date) {
    if (!this.starsGeometry || this.starsData.length === 0) return;

    const positions = this.starsGeometry.attributes.position.array as Float32Array;
    const r = 1000;

    for (let i = 0; i < this.starsData.length; i++) {
      const star = this.starsData[i];
      const { az, alt } = calculateAzAlt(star.ra, star.dec, lat, lon, time);

      const altRad = alt * Math.PI / 180.0;
      const azRad = az * Math.PI / 180.0;

      const y = r * Math.sin(altRad);
      const z = -r * Math.cos(altRad) * Math.cos(azRad);
      const x = r * Math.cos(altRad) * Math.sin(azRad);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
    }

    this.starsGeometry.attributes.position.needsUpdate = true;
  }

  /**
   * 생성된 항성 포인트 지오메트리 및 메테리얼 자원을 메모리에서 해제합니다.
   */
  public dispose() {
    if (this.starsPoints) this.scene.remove(this.starsPoints);
    this.starsGeometry?.dispose();
    this.starsMaterial?.dispose();
  }
}
