import * as THREE from 'three';
import { CONSTELLATION_BOUNDARIES } from '../data/ConstellationBoundaries';
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
  private readonly linePoints: EquatorialPoint[] = [];
  private readonly lineGeometry: THREE.BufferGeometry;
  private readonly lineMaterial: THREE.ShaderMaterial;
  private readonly lineSegments: THREE.LineSegments;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.lineGeometry = new THREE.BufferGeometry();
    this.lineMaterial = this.createLineMaterial();

    this.collectLinePoints();
    this.lineGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(this.linePoints.length * 3), 3)
    );

    this.lineSegments = new THREE.LineSegments(this.lineGeometry, this.lineMaterial);
    this.lineSegments.frustumCulled = false;
    this.lineSegments.renderOrder = 5.15;
    this.scene.add(this.lineSegments);
  }

  public update(lat: number, lon: number, time: Date): void {
    this.updateLines(lat, lon, time);
  }

  public updateUniforms(fov: number, aspect: number): void {
    this.lineMaterial.uniforms.fov.value = fov;
    this.lineMaterial.uniforms.aspect.value = aspect;
  }

  public setVisible(visible: boolean): void {
    this.lineSegments.visible = visible;
  }

  public dispose(): void {
    this.scene.remove(this.lineSegments);
    this.lineGeometry.dispose();
    this.lineMaterial.dispose();
  }

  private collectLinePoints(): void {
    for (const boundary of CONSTELLATION_BOUNDARIES) {
      for (const loop of boundary.loops) {
        if (loop.length < 2) continue;

        for (let index = 0; index < loop.length; index++) {
          const start = loop[index];
          const end = loop[(index + 1) % loop.length];
          this.linePoints.push({ ra: start[0], dec: start[1] }, { ra: end[0], dec: end[1] });
        }
      }
    }
  }

  private updateLines(lat: number, lon: number, time: Date): void {
    const positions = this.lineGeometry.attributes.position.array as Float32Array;

    for (let index = 0; index < this.linePoints.length; index++) {
      const point = this.linePoints[index];
      const position = this.equatorialToWorld(point.ra, point.dec, lat, lon, time, 994.5);

      positions[index * 3] = position.x;
      positions[index * 3 + 1] = position.y;
      positions[index * 3 + 2] = position.z;
    }

    this.lineGeometry.attributes.position.needsUpdate = true;
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
        color: { value: new THREE.Color(0x8dcfb0) },
        opacity: { value: 0.34 },
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
}
