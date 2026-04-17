import * as THREE from 'three';
import { calculateAzAlt, j2000ToJNow } from '../math/CelestialMath';

/**
 * 32개의 고해상도 타일을 사용하여 천구 배경을 렌더링하는 레이어입니다.
 * DataTexture2DArray를 사용하여 셰이더에서 인덱스 기반으로 타일을 샘플링합니다.
 */
export class SkymapLayer {
  private scene: THREE.Scene;
  private basePath: string;
  private mesh: THREE.Mesh | null = null;
  private material: THREE.ShaderMaterial | null = null;
  
  private readonly ROWS = 4;
  private readonly COLS = 8;
  private readonly TILE_SIZE = 512;

  private currentOpacity = 0.0;
  private targetOpacity = 1.0;
  private readonly fadeSpeed = 0.02;

  private invCelestialMatrix = new THREE.Matrix4();
  private textureArray: THREE.DataTexture2DArray | null = null;

  constructor(scene: THREE.Scene, assetPath: string) {
    this.scene = scene;
    this.basePath = assetPath;

    this.init().catch(err => console.error('SkymapLayer 초기화 실패:', err));
  }

  private async init() {
    await this.loadTextureArray();
    this.initLayer();
  }

  /**
   * 32개의 타일을 병렬로 로드하여 단일 TextureArray로 통합합니다.
   */
  private async loadTextureArray() {
    const loader = new THREE.ImageLoader();
    const promises: Promise<{img: HTMLImageElement, r: number, c: number}>[] = [];

    for (let r = 0; r < this.ROWS; r++) {
      for (let c = 0; c < this.COLS; c++) {
        const url = `${this.basePath}skymap/z1/skymap_z1_${r}_{c}.webp`
          .replace('{r}', r.toString())
          .replace('{c}', c.toString());
        
        promises.push(new Promise((resolve) => {
          loader.load(url, (img) => {
            resolve({ img, r, c });
          }, undefined, () => {
             console.warn(`타일 로드 실패: ${url}`);
             resolve({ img: document.createElement('canvas') as any, r, c });
          });
        }));
      }
    }

    const results = await Promise.all(promises);
    
    // WebGL 2.0 DataTexture2DArray를 위한 데이터 버퍼 생성 (RGBA)
    const data = new Uint8Array(this.TILE_SIZE * this.TILE_SIZE * results.length * 4);
    const canvas = document.createElement('canvas');
    canvas.width = this.TILE_SIZE;
    canvas.height = this.TILE_SIZE;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

    for (const res of results) {
      ctx.clearRect(0, 0, this.TILE_SIZE, this.TILE_SIZE);
      ctx.drawImage(res.img, 0, 0, this.TILE_SIZE, this.TILE_SIZE);
      const imageData = ctx.getImageData(0, 0, this.TILE_SIZE, this.TILE_SIZE).data;
      
      const layerIndex = res.r * this.COLS + res.c;
      const offset = layerIndex * this.TILE_SIZE * this.TILE_SIZE * 4;
      data.set(imageData, offset);
    }

    this.textureArray = new THREE.DataArrayTexture(data, this.TILE_SIZE, this.TILE_SIZE, results.length);
    this.textureArray.format = THREE.RGBAFormat;
    this.textureArray.type = THREE.UnsignedByteType;
    this.textureArray.minFilter = THREE.LinearFilter;
    this.textureArray.magFilter = THREE.LinearFilter;
    this.textureArray.colorSpace = THREE.SRGBColorSpace;
    this.textureArray.needsUpdate = true;
  }

  private initLayer() {
    if (!this.textureArray) return;

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
      precision highp sampler2DArray;

      varying vec2 vUv;
      uniform sampler2DArray texArray;
      uniform float fov;
      uniform float aspect;
      uniform float opacity;
      uniform mat4 invCelestialMatrix;

      #define PI 3.14159265359

      out vec4 outColor;

      void main() {
        vec2 proj = (vUv - 0.5) * 2.0;
        float fovRad = radians(fov);
        float scale = 1.0 / tan(fovRad / 4.0);
        
        vec2 p = vec2(proj.x * aspect, proj.y) / scale;
        float L2 = dot(p, p);
        
        float z = (L2 - 1.0) / (L2 + 1.0);
        float x = (1.0 - z) * p.x;
        float y = (1.0 - z) * p.y;
        vec3 viewDir = vec3(x, y, z);
        
        vec3 worldDir = normalize((invCelestialMatrix * vec4(viewDir, 0.0)).xyz);
        
        // RA, Dec 계산
        // worldDir.z = -cos(Dec)*sin(RA) (local Z축이 RA=18h 방향)이므로 부호 반전 필요
        float ra = atan(-worldDir.z, worldDir.x);
        float raNorm = ra < 0.0 ? ra + 2.0 * PI : ra;
        float dec = asin(worldDir.y);
        float decNorm = (dec / PI) + 0.5; // 0.0(Dec -90°/남극) ~ 1.0(Dec +90°/북극)

        // 타일 인덱스 계산 (8x4 그리드)
        // RA 배치: 가운데(col 3-4 경계) = RA 0h, 좌측 끝(col 0) = RA 12h
        // RA는 오른쪽으로 갈수록 감소 (천구 내부에서 바라보는 방향)
        // Dec 배치: row 0(상단) = Dec -90°(남극), row 3(하단) = Dec +90°(북극)
        float raCoord  = mod((PI - raNorm) * 8.0 / (2.0 * PI) + 8.0, 8.0);
        float decCoord = clamp(decNorm * 4.0, 0.0, 3.9999);
        float col = floor(raCoord);
        float row = floor(decCoord);
        float layerIndex = row * 8.0 + col;

        // 타일 내부 UV 계산
        // DataArrayTexture: V=0 = data[0] = 이미지 상단 = 해당 타일의 낮은 Dec 쪽
        vec2 tileUv;
        tileUv.x = fract(raCoord);
        tileUv.y = fract(decCoord);

        // TextureArray 샘플링
        vec4 color = texture(texArray, vec3(tileUv, layerIndex));

        // 시인성 보강: 밝기 부스트(5.0배) 및 감마 보정으로 어두운 영역 극대화
        vec3 finalColor = color.rgb * 1.0;
        finalColor = pow(finalColor, vec3(0.6)); // 어두운 영역을 훨씬 더 밝게 끌어올림
        
        outColor = vec4(finalColor, color.a * opacity);
      }
    `;

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        texArray: { value: this.textureArray },
        fov: { value: 60.0 },
        aspect: { value: 1.0 },
        opacity: { value: this.currentOpacity },
        invCelestialMatrix: { value: this.invCelestialMatrix }
      },
      transparent: true,
      depthWrite: false,
      depthTest: false,
      glslVersion: THREE.GLSL3 // WebGL 2.0 기능을 위해 필요
    });

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.renderOrder = -1;
    this.scene.add(this.mesh);
  }

  public update(lat: number, lon: number, time: Date, camera: THREE.Camera): void {
    const diff = this.targetOpacity - this.currentOpacity;
    if (Math.abs(diff) > 0.001) {
      this.currentOpacity += Math.sign(diff) * Math.min(Math.abs(diff), this.fadeSpeed);
      if (this.material) this.material.uniforms.opacity.value = this.currentOpacity;
    }

    if (!this.material) return;

    const tempGroup = new THREE.Group();
    // [V16 세차 보정]
    // 배경 이미지(J2000)를 현재 시점(JNow)의 하늘에 맞추기 위해 좌표축을 보정합니다.
    const polarJNow = j2000ToJNow(0, 90, time);
    const equinoxJNow = j2000ToJNow(0, 0, time);

    const polar = this.getDirection(polarJNow.ra, polarJNow.dec, lat, lon, time);
    const equinox = this.getDirection(equinoxJNow.ra, equinoxJNow.dec, lat, lon, time);

    tempGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), polar);
    const currentX = new THREE.Vector3(1, 0, 0).applyQuaternion(tempGroup.quaternion);
    const targetX = equinox.clone().projectOnPlane(polar).normalize();
    const alignQuat = new THREE.Quaternion().setFromUnitVectors(currentX, targetX);
    tempGroup.quaternion.multiplyQuaternions(alignQuat, tempGroup.quaternion);
    
    tempGroup.updateMatrixWorld();

    const invCelestialRot = tempGroup.matrixWorld.clone().invert();
    this.invCelestialMatrix.multiplyMatrices(invCelestialRot, camera.matrixWorld);
    this.material.uniforms.invCelestialMatrix.value = this.invCelestialMatrix;
  }

  private getDirection(ra: number, dec: number, lat: number, lon: number, time: Date): THREE.Vector3 {
    const { az, alt } = calculateAzAlt(ra, dec, lat, lon, time);
    const altRad = alt * Math.PI / 180;
    const azRad = az * Math.PI / 180;
    return new THREE.Vector3(
      Math.cos(altRad) * Math.sin(azRad),
      Math.sin(altRad),
      -Math.cos(altRad) * Math.cos(azRad)
    );
  }

  public updateUniforms(fov: number, aspect: number) {
    if (this.material) {
      this.material.uniforms.fov.value = fov;
      this.material.uniforms.aspect.value = aspect;
    }
  }

  public setVisibility(visible: boolean) {
    this.targetOpacity = visible ? 1.0 : 0.0;
  }

  public dispose() {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
    }
    this.material?.dispose();
    this.textureArray?.dispose();
  }
}
