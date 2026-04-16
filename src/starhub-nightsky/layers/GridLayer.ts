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

  private azimuthalMaterials: THREE.ShaderMaterial[] = [];
  private equatorialMaterials: THREE.ShaderMaterial[] = [];
  private equatorialGroup: THREE.Group = new THREE.Group();

  // 페이드 애니메이션 관련 상태
  private azimuthalCurrentOpacity = 0.0;
  private azimuthalTargetOpacity = 0.0; 
  private equatorialCurrentOpacity = 0.0;
  private equatorialTargetOpacity = 0.0;
  private readonly fadeSpeed = 0.03;

  /**
   * GridManager 인스턴스를 생성하며 두 좌표계의 배경 선들을 초기화합니다.
   * @param scene 그리드를 렌더링할 씬 객체
   */
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createAzimuthalGrid();
    this.createEquatorialGrid();
    this.scene.add(this.equatorialGroup);

    // 초기 상태 반영: 렌더링 루틴 보호를 위해 그룹/객체 단위 가시성 초기화
    if (this.azimuthalGridLines) this.azimuthalGridLines.visible = false;
    if (this.horizonLineObj) this.horizonLineObj.visible = false;
    this.equatorialGroup.visible = false;
  }

  /**
   * 모든 그리드 재질의 투영 모드 및 카메라 상태(유니폼)를 일괄 업데이트합니다.
   * @param fov 시야각
   * @param aspect 화면비율
   */
  public updateUniforms(fov: number, aspect: number) {
    const allMaterials = [...this.azimuthalMaterials, ...this.equatorialMaterials];
    for (const mat of allMaterials) {
      mat.uniforms.fov.value = fov;
      mat.uniforms.aspect.value = aspect;
    }
  }

  private createGridMaterial(colorHex: number, opacity: number, type: 'azimuthal' | 'equatorial'): THREE.ShaderMaterial {
    const color = new THREE.Color(colorHex);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: color },
        opacity: { value: 0.0 }, // 초기값은 0으로 시작
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
    
    if (type === 'azimuthal') this.azimuthalMaterials.push(mat);
    else this.equatorialMaterials.push(mat);
    
    return mat;
  }

  /**
   * UI 토글에 반응하여 각 그리드의 가시성 여부를 제어합니다.
   * 즉시 끄는 대신 타겟 투명도를 설정하여 페이드 애니메이션을 유도합니다.
   */
  public toggleGrids(showAzimuthal: boolean, showEquatorial: boolean) {
    this.azimuthalTargetOpacity = showAzimuthal ? 0.7 : 0.0;
    this.equatorialTargetOpacity = showEquatorial ? 0.7 : 0.0;

    // 나타나야 할 때는 즉시 씬 가시성을 켜서 페이드 인이 보이게 함
    if (showAzimuthal) {
      if (this.azimuthalGridLines) this.azimuthalGridLines.visible = true;
      if (this.horizonLineObj) this.horizonLineObj.visible = true;
    }
    if (showEquatorial) {
      this.equatorialGroup.visible = true;
    }
  }

  /**
   * 시간 경과나 관측지점의 변경에 따라 적도좌표계(Equatorial)를 회전시킵니다.
   * 또한 페이드 애니메이션을 처리합니다.
   */
  public update(lat: number, lon: number, time: Date) {
    this.updateAnimation();
    this.updateEquatorialGeometry(lat, lon, time);
  }

  private updateAnimation(): void {
    // 1. 지평 격자 페이드
    const azDiff = this.azimuthalTargetOpacity - this.azimuthalCurrentOpacity;
    if (Math.abs(azDiff) > 0.001) {
      this.azimuthalCurrentOpacity += Math.sign(azDiff) * Math.min(Math.abs(azDiff), this.fadeSpeed);
      for (const mat of this.azimuthalMaterials) {
        mat.uniforms.opacity.value = this.azimuthalCurrentOpacity;
      }
    } else {
      this.azimuthalCurrentOpacity = this.azimuthalTargetOpacity;
      if (this.azimuthalCurrentOpacity <= 0) {
        if (this.azimuthalGridLines) this.azimuthalGridLines.visible = false;
        if (this.horizonLineObj) this.horizonLineObj.visible = false;
      }
    }

    // 2. 적도 격자 페이드
    const eqDiff = this.equatorialTargetOpacity - this.equatorialCurrentOpacity;
    if (Math.abs(eqDiff) > 0.001) {
      this.equatorialCurrentOpacity += Math.sign(eqDiff) * Math.min(Math.abs(eqDiff), this.fadeSpeed);
      for (const mat of this.equatorialMaterials) {
        mat.uniforms.opacity.value = this.equatorialCurrentOpacity;
      }
    } else {
      this.equatorialCurrentOpacity = this.equatorialTargetOpacity;
      if (this.equatorialCurrentOpacity <= 0) {
        this.equatorialGroup.visible = false;
      }
    }
  }

  private updateEquatorialGeometry(lat: number, lon: number, time: Date) {
    if (!this.equatorialGridGeometry || this.equatorialGridData.length === 0 || this.equatorialCurrentOpacity <= 0) return;

    // Update main grid
    const positions = this.equatorialGridGeometry.attributes.position.array as Float32Array;
    const r = 990;

    for (let i = 0; i < this.equatorialGridData.length; i++) {
      const pt = this.equatorialGridData[i];
      const { az, alt } = calculateAzAlt(pt.ra, pt.dec, lat, lon, time);

      const altRad = alt * Math.PI / 180.0;
      const azRad = az * Math.PI / 180.0;

      positions[i * 3] = r * Math.cos(altRad) * Math.sin(azRad);
      positions[i * 3 + 1] = r * Math.sin(altRad);
      positions[i * 3 + 2] = -r * Math.cos(altRad) * Math.cos(azRad);
    }
    this.equatorialGridGeometry.attributes.position.needsUpdate = true;

    // Update Celestial Equator
    if (this.equatorGeometry && this.equatorData.length > 0) {
      const eqPositions = this.equatorGeometry.attributes.position.array as Float32Array;
      for (let i = 0; i < this.equatorData.length; i++) {
        const pt = this.equatorData[i];
        const { az, alt } = calculateAzAlt(pt.ra, pt.dec, lat, lon, time);
        const altRad = alt * Math.PI / 180.0;
        const azRad = az * Math.PI / 180.0;
        eqPositions[i * 3] = r * Math.cos(altRad) * Math.sin(azRad);
        eqPositions[i * 3 + 1] = r * Math.sin(altRad);
        eqPositions[i * 3 + 2] = -r * Math.cos(altRad) * Math.cos(azRad);
      }
      this.equatorGeometry.attributes.position.needsUpdate = true;
    }
  }

  private createAzimuthalGrid() {
    const material = this.createGridMaterial(0xff8c00, 1.0, 'azimuthal'); // 화사한 다크 오렌지
    const r = 990;
    const positions = [];

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

    for (let az = 0; az < 360; az += 15) {
      const azRad = az * Math.PI / 180;
      const limitAlt = (az % 90 === 0) ? 88 : 80;
      for (let alt = -limitAlt; alt < limitAlt; alt += 2) {
        const altRad1 = alt * Math.PI / 180;
        const altRad2 = (alt + 2) * Math.PI / 180;
        positions.push(r * Math.cos(altRad1) * Math.sin(azRad), r * Math.sin(altRad1), -r * Math.cos(altRad1) * Math.cos(azRad));
        positions.push(r * Math.cos(altRad2) * Math.sin(azRad), r * Math.sin(altRad2), -r * Math.cos(altRad2) * Math.cos(azRad));
      }
    }

    this.azimuthalGridGeometry = new THREE.BufferGeometry();
    this.azimuthalGridGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    this.azimuthalGridLines = new THREE.LineSegments(this.azimuthalGridGeometry, material);
    this.azimuthalGridLines.renderOrder = 5;
    this.scene.add(this.azimuthalGridLines);

    const horizonMat = this.createGridMaterial(0xffd700, 1.0, 'azimuthal'); // 지평선은 눈에 띄는 순금색
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

  private createEquatorialGrid() {
    this.equatorialGridData = [];
    const material = this.createGridMaterial(0x00bfff, 1.0, 'equatorial'); // 선명한 딥 스카이 블루

    for (let dec = -72; dec <= 72; dec += 18) {
      if (dec === 0) continue;
      for (let ra = 0; ra < 360; ra += 2) {
        this.equatorialGridData.push({ ra: ra, dec: dec }, { ra: ra + 2, dec: dec });
      }
    }

    for (let ra = 0; ra < 360; ra += 15) {
      const minDec = (ra % 90 === 0) ? -90 : -72;
      const maxDec = (ra % 90 === 0) ? 90 : 72;
      for (let dec = minDec; dec < maxDec; dec += 2) {
        this.equatorialGridData.push({ ra: ra, dec: dec }, { ra: ra, dec: dec + 2 });
      }
    }

    this.equatorialGridGeometry = new THREE.BufferGeometry();
    this.equatorialGridGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.equatorialGridData.length * 3), 3));
    this.equatorialGridLines = new THREE.LineSegments(this.equatorialGridGeometry, material);
    this.equatorialGridLines.renderOrder = 5;
    this.equatorialGroup.add(this.equatorialGridLines);

    const equatorMat = this.createGridMaterial(0x00ffff, 1.0, 'equatorial'); // 적도선은 형광 시안(Neon Cyan)
    for (let ra = 0; ra <= 360; ra += 2) this.equatorData.push({ ra: ra, dec: 0 });
    this.equatorGeometry = new THREE.BufferGeometry();
    this.equatorGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.equatorData.length * 3), 3));
    this.equatorLineObj = new THREE.LineLoop(this.equatorGeometry, equatorMat);
    this.equatorLineObj.renderOrder = 5;
    this.equatorialGroup.add(this.equatorLineObj);
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
    [...this.azimuthalMaterials, ...this.equatorialMaterials].forEach(mat => mat.dispose());
  }
}
