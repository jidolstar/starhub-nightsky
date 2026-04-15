import * as THREE from 'three';
import { calculateAzAlt } from '../math/CelestialMath';

/**
 * 지평좌표계(Azimuthal) 및 적도좌표계(Equatorial) 그리드 선을 생성하고 렌더링하는 매니저 클래스.
 * Stereographic/Perspective 투영 변환 및 Tearing 방지용 셰이더를 포함합니다.
 */
export class GridLayer {
  private scene: THREE.Scene;

  private azimuthalGridGeometry: THREE.BufferGeometry | null = null;
  private azimuthalGridLines: THREE.LineSegments | null = null;
  private horizonGeometry: THREE.BufferGeometry | null = null;
  private horizonLineObj: THREE.LineLoop | null = null;

  private equatorialGridGeometry: THREE.BufferGeometry | null = null;
  private equatorialGridLines: THREE.LineSegments | null = null;
  private equatorialGridData: { ra: number; dec: number }[] = [];

  private equatorGeometry: THREE.BufferGeometry | null = null;
  private equatorLineObj: THREE.LineLoop | null = null;
  private equatorData: { ra: number; dec: number }[] = [];

  private materials: THREE.ShaderMaterial[] = [];
  private equatorialGroup: THREE.Group = new THREE.Group();

  /**
   * GridManager 인스턴스를 생성하며 두 좌표계의 배경 선들을 초기화합니다.
   * @param scene 그리드를 렌더링할 씬 객체
   */
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createAzimuthalGrid();
    this.createEquatorialGrid();
    this.scene.add(this.equatorialGroup);
  }

  /**
   * 모든 그리드 재질의 투영 모드 및 카메라 상태(유니폼)를 일괄 업데이트합니다.
   * @param fov 시야각
   * @param aspect 화면비율
   */
  public updateUniforms(fov: number, aspect: number) {
    for (const mat of this.materials) {
      mat.uniforms.fov.value = fov;
      mat.uniforms.aspect.value = aspect;
    }
  }

  private createGridMaterial(colorHex: number, opacity: number): THREE.ShaderMaterial {
    const color = new THREE.Color(colorHex);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: color },
        opacity: { value: opacity },
        fov: { value: 60.0 },
        aspect: { value: 1.0 }
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
    this.materials.push(mat);
    return mat;
  }

  /**
   * UI 토글에 반응하여 각 그리드의 가시성 여부를 제어합니다.
   * @param showAzimuthal 지평좌표계 표시 여부
   * @param showEquatorial 적도좌표계 표시 여부
   */
  public toggleGrids(showAzimuthal: boolean, showEquatorial: boolean) {
    if (this.azimuthalGridLines) this.azimuthalGridLines.visible = showAzimuthal;
    if (this.horizonLineObj) this.horizonLineObj.visible = showAzimuthal;
    if (this.equatorialGridLines) this.equatorialGridLines.visible = showEquatorial;
    if (this.equatorLineObj) this.equatorialGroup.visible = showEquatorial;
  }

  /**
   * 고도 및 방위각 기반의 지평 좌표계 그물망(그리드)을 구축하여 씬에 추가합니다.
   * 방위각을 따라 뻗어나가는 세로선 및 수평 고도를 나타내는 가로선을 생성합니다.
   */
  private createAzimuthalGrid() {
    // Light green for Azimuthal (Horizontal) grid
    const material = this.createGridMaterial(0x4a7c59, 0.6);
    const r = 990;
    const positions = [];

    // Altitude lines (Parallels) every 10 degrees (Skipping 0 for horizon)
    for (let alt = -80; alt <= 80; alt += 10) {
      if (alt === 0) continue;
      const altRad = alt * Math.PI / 180;
      const y = r * Math.sin(altRad);
      const radius = r * Math.cos(altRad);
      for (let az = 0; az < 360; az += 2) {
        const azRad1 = az * Math.PI / 180;
        const azRad2 = (az + 2) * Math.PI / 180;
        positions.push(radius * Math.sin(azRad1), y, -radius * Math.cos(azRad1));
        positions.push(radius * Math.sin(azRad2), y, -radius * Math.cos(azRad2));
      }
    }

    // Azimuth lines (Meridians) every 15 degrees
    for (let az = 0; az < 360; az += 15) {
      const azRad = az * Math.PI / 180;
      for (let alt = -88; alt < 88; alt += 2) {
        const altRad1 = alt * Math.PI / 180;
        const altRad2 = (alt + 2) * Math.PI / 180;

        const y1 = r * Math.sin(altRad1);
        const z1 = -r * Math.cos(altRad1) * Math.cos(azRad);
        const x1 = r * Math.cos(altRad1) * Math.sin(azRad);

        const y2 = r * Math.sin(altRad2);
        const z2 = -r * Math.cos(altRad2) * Math.cos(azRad);
        const x2 = r * Math.cos(altRad2) * Math.sin(azRad);

        positions.push(x1, y1, z1);
        positions.push(x2, y2, z2);
      }
    }

    this.azimuthalGridGeometry = new THREE.BufferGeometry();
    this.azimuthalGridGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    this.azimuthalGridLines = new THREE.LineSegments(this.azimuthalGridGeometry, material);
    this.azimuthalGridLines.renderOrder = 5;
    this.scene.add(this.azimuthalGridLines);

    // Draw distinct Horizon Line (Brighter green)
    const horizonMat = this.createGridMaterial(0x60a773, 1.0);
    const horizPos = [];
    for (let az = 0; az <= 360; az += 2) {
      const azRad = az * Math.PI / 180;
      horizPos.push(r * Math.sin(azRad), 0, -r * Math.cos(azRad));
    }
    this.horizonGeometry = new THREE.BufferGeometry();
    this.horizonGeometry.setAttribute('position', new THREE.Float32BufferAttribute(horizPos, 3));
    this.horizonLineObj = new THREE.LineLoop(this.horizonGeometry, horizonMat);
    this.horizonLineObj.renderOrder = 5;
    this.scene.add(this.horizonLineObj);
  }

  /**
   * 적경(RA) 및 적위(Dec) 기반의 적도 좌표계 그물망을 구축하여 씬에 추가합니다.
   * 적도는 밝고 푸른 색으로, 그 외 극 방향의 선들도 스텔라리움 스타일로 그립니다.
   */
  private createEquatorialGrid() {
    this.equatorialGridData = [];
    // Stellarium distinct blue
    const material = this.createGridMaterial(0x3a7eab, 0.8);

    // Parallels (Declination lines) every 10 degrees (excluding 0 for the Equator)
    for (let dec = -72; dec <= 72; dec += 18) {
      if (dec === 0) continue;
      for (let ra = 0; ra < 360; ra += 2) {
        this.equatorialGridData.push({ ra: ra, dec: dec });
        this.equatorialGridData.push({ ra: ra + 2, dec: dec });
      }
    }

    // Meridians (RA lines) every 1 hour = 15 degrees
    for (let ra = 0; ra < 360; ra += 15) {
      // Only 0, 90, 180, 270 degrees (0, 6, 12, 18 hours) reach the exact poles
      const minDec = (ra % 90 === 0) ? -90 : -72;
      const maxDec = (ra % 90 === 0) ? 90 : 72;

      for (let dec = minDec; dec < maxDec; dec += 2) {
        this.equatorialGridData.push({ ra: ra, dec: dec });
        this.equatorialGridData.push({ ra: ra, dec: dec + 2 });
      }
    }

    this.equatorialGridGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.equatorialGridData.length * 3);
    this.equatorialGridGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.equatorialGridLines = new THREE.LineSegments(this.equatorialGridGeometry, material);
    this.equatorialGridLines.renderOrder = 5;
    this.equatorialGroup.add(this.equatorialGridLines);

    // Distinct Celestial Equator (dec = 0)
    this.equatorData = [];
    const equatorMat = this.createGridMaterial(0x6ab2db, 1.0);
    for (let ra = 0; ra <= 360; ra += 2) {
      this.equatorData.push({ ra: ra, dec: 0 });
    }
    this.equatorGeometry = new THREE.BufferGeometry();
    const eqPositions = new Float32Array(this.equatorData.length * 3);
    this.equatorGeometry.setAttribute('position', new THREE.BufferAttribute(eqPositions, 3));
    this.equatorLineObj = new THREE.LineLoop(this.equatorGeometry, equatorMat);
    this.equatorLineObj.renderOrder = 5;
    this.equatorialGroup.add(this.equatorLineObj);
  }

  /**
   * 시간 경과나 관측지점의 변경에 따라 적도좌표계(Equatorial)를 회전시킵니다.
   * @param lat 지구상 위도
   * @param lon 지구상 경도
   * @param time 관측 시간
   */
  public update(lat: number, lon: number, time: Date) {
    if (!this.equatorialGridGeometry || this.equatorialGridData.length === 0) return;

    // Update main grid
    const positions = this.equatorialGridGeometry.attributes.position.array as Float32Array;
    const r = 990;

    for (let i = 0; i < this.equatorialGridData.length; i++) {
      const pt = this.equatorialGridData[i];
      const { az, alt } = calculateAzAlt(pt.ra, pt.dec, lat, lon, time);

      const altRad = alt * Math.PI / 180.0;
      const azRad = az * Math.PI / 180.0;

      const y = r * Math.sin(altRad);
      const z = -r * Math.cos(altRad) * Math.cos(azRad);
      const x = r * Math.cos(altRad) * Math.sin(azRad);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
    }
    this.equatorialGridGeometry.attributes.position.needsUpdate = true;

    // Update Celestial Equator precisely
    if (this.equatorGeometry && this.equatorData.length > 0) {
      const eqPositions = this.equatorGeometry.attributes.position.array as Float32Array;
      for (let i = 0; i < this.equatorData.length; i++) {
        const pt = this.equatorData[i];
        const { az, alt } = calculateAzAlt(pt.ra, pt.dec, lat, lon, time);

        const altRad = alt * Math.PI / 180.0;
        const azRad = az * Math.PI / 180.0;

        const y = r * Math.sin(altRad);
        const z = -r * Math.cos(altRad) * Math.cos(azRad);
        const x = r * Math.cos(altRad) * Math.sin(azRad);

        eqPositions[i * 3] = x;
        eqPositions[i * 3 + 1] = y;
        eqPositions[i * 3 + 2] = z;
      }
      this.equatorGeometry.attributes.position.needsUpdate = true;
    }
  }

  public dispose() {
    if (this.azimuthalGridLines) this.scene.remove(this.azimuthalGridLines);
    if (this.horizonLineObj) this.scene.remove(this.horizonLineObj);
    this.scene.remove(this.equatorialGroup);
    this.equatorialGroup.clear();

    this.azimuthalGridGeometry?.dispose();
    this.horizonGeometry?.dispose();
    this.equatorialGridGeometry?.dispose();
    this.equatorGeometry?.dispose();
    this.materials.forEach(mat => mat.dispose());
  }
}
