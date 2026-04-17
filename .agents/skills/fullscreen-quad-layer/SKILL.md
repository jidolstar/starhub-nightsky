---
name: fullscreen-quad-layer
description: 스테레오그래픽 투영(185° FOV) 환경에서 SphereGeometry 기반 레이어가 wide 화면에서 원형으로 렌더링되는 문제를 해결합니다. 지형(landscape), 대기, 안개 등 전체 화면을 균일하게 채워야 하는 레이어를 풀스크린 쿼드 + 역-스테레오그래픽 방식으로 전환할 때 사용합니다.
---

# 풀스크린 쿼드 레이어 (Fullscreen Quad Layer)

SphereGeometry 기반 레이어는 스테레오그래픽 투영에서 대원(지평선)이 원으로 투영되어 wide 화면 좌우에 구멍이 생긴다. 풀스크린 쿼드 + 역-스테레오그래픽 방식을 쓰면 화면 비율과 무관하게 전체 화면을 균일하게 커버한다.

## 언제 이 스킬을 사용하는가

- wide 화면(aspect > 1.5)에서 지형·안개·대기 등의 레이어가 중앙 원형 영역만 채우고 좌우가 검게 비는 현상이 발생할 때
- `SphereGeometry` + 스테레오그래픽 투영 셰이더를 쓰는 레이어의 경계가 화면비 변화에 따라 이상하게 잘릴 때
- 카메라 뒤쪽 방향(`vDir.z > 0`)에서 tearing 방지용 페이드가 오히려 가장자리를 지워버릴 때

## 사용 방법

### 1. 지오메트리 교체

```ts
// 이전: SphereGeometry
const geometry = new THREE.SphereGeometry(980, 128, 64);
// material: side: THREE.BackSide

// 이후: PlaneGeometry(2,2) — NDC 전체를 덮는 풀스크린 쿼드
const geometry = new THREE.PlaneGeometry(2, 2);
// material: depthTest: false
```

### 2. 버텍스 셰이더

좌표 변환 없이 NDC 그대로 출력한다. `gl_Position.w = 1.0`으로 perspective divide를 막는다.

```glsl
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 1.0, 1.0);
}
```

### 3. 프래그먼트 셰이더 — 역-스테레오그래픽

화면 UV → 뷰 방향 벡터 → 월드 방향 벡터 순으로 변환한다.
`cameraWorldMatrix` uniform으로 뷰 공간에서 월드 공간으로 변환한다.

```glsl
uniform float fov;
uniform float aspect;
uniform mat4 cameraWorldMatrix;

// 역-스테레오그래픽
vec2 proj = (vUv - 0.5) * 2.0;
float scale = 1.0 / tan(radians(fov) / 4.0);
vec2 p = vec2(proj.x * aspect, proj.y) / scale;
float L2 = dot(p, p);
float z = (L2 - 1.0) / (L2 + 1.0);
vec3 viewDir = vec3((1.0 - z) * p.x, (1.0 - z) * p.y, z);

// 뷰 공간 → 월드 공간
vec3 worldDir = normalize((cameraWorldMatrix * vec4(viewDir, 0.0)).xyz);
```

이후 `worldDir.y` (= sin(alt))로 고도를 판별해 지평선 이상이면 `discard`, 이하면 색상을 출력한다.

### 4. uniform 추가 및 매 프레임 업데이트

```ts
// ShaderMaterial uniforms
uniforms: {
  fov:               { value: 60.0 },
  aspect:            { value: 1.0 },
  cameraWorldMatrix: { value: new THREE.Matrix4() },
  // ...기타 기존 uniforms
}

// SkyRenderer 렌더 루프
this.landscapeLayer.updateUniforms(
  this.camera.fov,
  this.camera.aspect,
  cameraPitch,
  this.camera.matrixWorld,  // ← 추가
);
```

### 5. tearing protection 제거

풀스크린 쿼드에는 등분 없이 픽셀마다 방향을 계산하므로 tearing이 발생하지 않는다.
기존 `vDir.z` 기반 페이드(아래 코드)는 **반드시 제거**한다.

```glsl
// 제거 대상
float fade = 1.0 - smoothstep(0.5, 0.8, vDir.z);
alpha *= fade;
```

### 6. renderOrder 유지

`this.mesh.renderOrder = 30` — 별·그리드보다 나중에 그려져 지평선이 확실히 덮어야 한다.
