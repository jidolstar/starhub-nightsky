import * as THREE from 'three';

/**
 * 지형(산, 나무 등) 실루엣을 렌더링하고 관리하는 매니저 클래스.
 * 내부적으로 수학 연산(Noise/FBM)을 사용한 ShaderMaterial로 무한 해상도의 지형을 생성합니다.
 */
export class LandscapeLayer {
  private scene: THREE.Scene;
  private mesh: THREE.Mesh | null = null;
  private material: THREE.ShaderMaterial | null = null;

  // 페이드 애니메이션 관련
  private currentOpacity = 1.0;
  private targetOpacity = 1.0;
  private readonly fadeSpeed = 0.03;

  /**
   * LandscapeManager 인스턴스를 생성합니다.
   * @param scene 지형 메쉬를 추가할 Three.js Scene 객체
   */
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initLandscape();
  }

  /**
   * 렌더링에 사용할 구체(Sphere) 지오메트리 및 절차적 지형 셰이더를 초기화합니다.
   * 투영 왜곡(방위각, 고도 등) 및 노이즈 기반 실루엣 공식을 설정합니다.
   */
  private initLandscape() {
    const geometry = new THREE.SphereGeometry(980, 128, 64);

    const vertexShader = `
      varying vec3 vWorldPosition;
      uniform float fov;
      uniform float aspect;
      varying vec3 vDir;

      void main() {
        // vWorldPosition is used for physical landscape positioning
        vWorldPosition = position;
        
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vec3 dir = normalize(mvPosition.xyz);
        vDir = dir;

        float fovRad = radians(fov);
        float scale = 1.0 / tan(fovRad / 4.0);
        
        vec2 proj = vec2(dir.x, dir.y) / (1.0 - dir.z) * scale;

        gl_Position = vec4(proj.x / aspect, proj.y, -dir.z * 0.001, 1.0);
      }
    `;

    const fragmentShader = `
      varying vec3 vWorldPosition;
      varying vec3 vDir;
      
      uniform float cameraPitch;
      uniform float globalAlpha;

      // Simple pseudo-random function
      float hash(float n) { return fract(sin(n) * 1e4); }
      float noise(float x) {
          float i = floor(x);
          float f = fract(x);
          float u = f * f * (3.0 - 2.0 * f);
          return mix(hash(i), hash(i + 1.0), u);
      }

      // Fractal Brownian Motion for rich tree/mountain silhouettes
      float fbm(float x) {
          float v = 0.0;
          float a = 0.5;
          float shift = float(100.0);
          for (int i = 0; i < 5; ++i) {
              v += a * noise(x);
              x = x * 2.0 + shift;
              a *= 0.5;
          }
          return v;
      }

      void main() {
        vec3 posVec = normalize(vWorldPosition);
        float az = atan(posVec.z, posVec.x);
        float alt = asin(posVec.y); 

        // Generate procedural horizon: ~2.5 degrees max height
        float horizonNoise = fbm(az * 10.0) * 0.025 + fbm(az * 50.0) * 0.01;
        float actualHorizon = horizonNoise - 0.005; // Base offset

        if (alt > actualHorizon) {
           discard;
        }

        // Dark forest silhouette color
        vec3 groundColor = vec3(0.01, 0.01, 0.015);
        float alpha = globalAlpha;

        // Dynamic camera perspective ground fading
        // If camera looks down, ground fades out to reveal lower stars
        float pitchDeg = degrees(cameraPitch);
        float pitchAlpha = smoothstep(-15.0, -2.0, pitchDeg);
        pitchAlpha = mix(0.3, 1.0, pitchAlpha); // 최소 투명도 0.3 유지

        alpha *= pitchAlpha;

        // Tearing protection in Stereographic mode
        float fade = 1.0 - smoothstep(0.5, 0.8, vDir.z);
        alpha *= fade;

        if (alpha < 0.01) discard;

        gl_FragColor = vec4(groundColor, alpha);
      }
    `;

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        fov: { value: 60.0 },
        aspect: { value: 1.0 },
        cameraPitch: { value: 0.0 },
        globalAlpha: { value: 1.0 }
      },
      transparent: true,
      depthWrite: false, // Ensure grid and stars correctly overlap
      side: THREE.BackSide // Viewer is inside the planet
    });

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.renderOrder = 30; // 별과 선보다 마지막에 그려서 지평선이 배경을 확실히 덮도록 합니다.
    this.scene.add(this.mesh);
  }

  /**
   * 매 프레임마다 애니메이션 상태를 갱신합니다.
   */
  public update(): void {
    const diff = this.targetOpacity - this.currentOpacity;
    if (Math.abs(diff) > 0.001) {
      this.currentOpacity += Math.sign(diff) * Math.min(Math.abs(diff), this.fadeSpeed);
      if (this.material) {
        this.material.uniforms.globalAlpha.value = this.currentOpacity;
      }

      if (this.currentOpacity > 0 && this.mesh && !this.mesh.visible) {
        this.mesh.visible = true;
      }
    } else {
      this.currentOpacity = this.targetOpacity;
      if (this.material) {
        this.material.uniforms.globalAlpha.value = this.targetOpacity;
      }
      if (this.currentOpacity <= 0 && this.mesh) {
        this.mesh.visible = false;
      }
    }
  }

  /**
   * 매 프레임마다 카메라의 시야각, 화면비율 및 카메라의 고도(Pitch)에 따라 셰이더 파라미터(Uniforms)를 업데이트합니다.
   * @param fov 카메라 시야각(Field of View)
   * @param aspect 화면 가로/세로 비율
   * @param cameraPitch 카메라가 위아래로 향하는 각도 (Radian). 음수일 경우 투명도 페이드아웃 적용
   */
  public updateUniforms(fov: number, aspect: number, cameraPitch: number) {
    if (this.material) {
      this.material.uniforms.fov.value = fov;
      this.material.uniforms.aspect.value = aspect;
      this.material.uniforms.cameraPitch.value = cameraPitch;
    }
  }

  /**
   * 지형 메쉬를 화면에 보이거나 숨기도록 상태를 변경합니다.
   * 즉시 끄는 대신 타겟 투명도를 조절하여 페이드 효과를 적용합니다.
   * @param visible 표시 여부
   */
  public setVisibility(visible: boolean) {
    this.targetOpacity = visible ? 1.0 : 0.0;
    
    // 켜질 때는 즉시 mesh 가시성을 확보하여 페이드 인이 보이게 함
    if (visible && this.mesh) {
      this.mesh.visible = true;
    }
  }

  /**
   * 생성된 지오메트리 및 메테리얼 자원을 메모리에서 해제합니다.
   */
  public dispose() {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
    }
    this.material?.dispose();
  }
}
