import * as THREE from 'three';

/**
 * 지형(산, 나무 등) 실루엣을 렌더링하고 관리하는 매니저 클래스.
 * 풀스크린 쿼드 + 역-스테레오그래픽 방식으로 전체 화면을 균일하게 커버한다.
 * wide 화면에서도 지면이 원형으로 잘리지 않는다.
 */
export class LandscapeLayer {
  private scene: THREE.Scene;
  private mesh: THREE.Mesh | null = null;
  private material: THREE.ShaderMaterial | null = null;

  private currentOpacity = 1.0;
  private targetOpacity = 1.0;
  private readonly fadeSpeed = 0.03;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initLandscape();
  }

  private initLandscape() {
    const geometry = new THREE.PlaneGeometry(2, 2);

    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 1.0, 1.0);
      }
    `;

    const fragmentShader = `
      precision highp float;

      varying vec2 vUv;
      uniform float fov;
      uniform float aspect;
      uniform float cameraPitch;
      uniform float globalAlpha;
      uniform mat4 cameraWorldMatrix;

      float hash(float n) { return fract(sin(n) * 1e4); }
      float noise(float x) {
        float i = floor(x);
        float f = fract(x);
        float u = f * f * (3.0 - 2.0 * f);
        return mix(hash(i), hash(i + 1.0), u);
      }

      float fbm(float x) {
        float v = 0.0;
        float a = 0.5;
        float shift = 100.0;
        for (int i = 0; i < 5; ++i) {
          v += a * noise(x);
          x = x * 2.0 + shift;
          a *= 0.5;
        }
        return v;
      }

      void main() {
        // 역-스테레오그래픽: 화면 UV → 뷰 방향 벡터
        vec2 proj = (vUv - 0.5) * 2.0;
        float scale = 1.0 / tan(radians(fov) / 4.0);
        vec2 p = vec2(proj.x * aspect, proj.y) / scale;
        float L2 = dot(p, p);
        float z = (L2 - 1.0) / (L2 + 1.0);
        vec3 viewDir = vec3((1.0 - z) * p.x, (1.0 - z) * p.y, z);

        // 뷰 공간 → 월드 공간
        vec3 worldDir = normalize((cameraWorldMatrix * vec4(viewDir, 0.0)).xyz);
        float alt = asin(clamp(worldDir.y, -1.0, 1.0));

        // 지평선 노이즈 (FBM)
        float az = atan(worldDir.z, worldDir.x);
        float horizonNoise = fbm(az * 10.0) * 0.025 + fbm(az * 50.0) * 0.01;
        float actualHorizon = horizonNoise - 0.005;

        if (alt > actualHorizon) {
          discard;
        }

        vec3 groundColor = vec3(0.01, 0.01, 0.015);
        float alpha = globalAlpha;

        // 카메라가 아래를 바라볼 때 지면 페이드
        float pitchDeg = degrees(cameraPitch);
        float pitchAlpha = smoothstep(-15.0, -2.0, pitchDeg);
        pitchAlpha = mix(0.3, 1.0, pitchAlpha);
        alpha *= pitchAlpha;

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
        globalAlpha: { value: 1.0 },
        cameraWorldMatrix: { value: new THREE.Matrix4() },
      },
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.renderOrder = 30;
    this.scene.add(this.mesh);
  }

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

  public updateUniforms(fov: number, aspect: number, cameraPitch: number, cameraWorldMatrix: THREE.Matrix4) {
    if (this.material) {
      this.material.uniforms.fov.value = fov;
      this.material.uniforms.aspect.value = aspect;
      this.material.uniforms.cameraPitch.value = cameraPitch;
      this.material.uniforms.cameraWorldMatrix.value = cameraWorldMatrix;
    }
  }

  public setVisibility(visible: boolean) {
    this.targetOpacity = visible ? 1.0 : 0.0;
    if (visible && this.mesh) {
      this.mesh.visible = true;
    }
  }

  public dispose() {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
    }
    this.material?.dispose();
  }
}
