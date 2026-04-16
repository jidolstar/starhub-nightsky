import * as THREE from 'three';

export class CameraController {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private onFovChange?: (newFov: number) => void;

  private cameraAzimuth: number = 0; // Start looking North
  private cameraAltitude: number = 0;  // Horizon
  private isDragging: boolean = false;
  private previousMousePosition = { x: 0, y: 0 };
  
  // 멀티 터치 관리를 위한 상태
  private activePointers: Map<number, PointerEvent> = new Map();
  private lastPinchDistance: number | null = null;

  constructor(
    camera: THREE.PerspectiveCamera, 
    domElement: HTMLElement, 
    onFovChange?: (newFov: number) => void
  ) {
    this.camera = camera;
    this.domElement = domElement;
    this.onFovChange = onFovChange;

    this.domElement.addEventListener('wheel', this.onWheel);
    this.domElement.addEventListener('pointerdown', this.onPointerDown);
    // pointerdown은 요소에, move/up은 윈도우에 등록하여 드래그 범위를 넓힘
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerUp);

    this.updateCameraLook();
  }

  public setFovCallback(callback: (fov: number) => void) {
    this.onFovChange = callback;
  }

  public setFov(fov: number) {
    this.camera.fov = fov;
    this.camera.updateProjectionMatrix();
  }

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    let newFov = this.camera.fov + (e.deltaY > 0 ? 5 : -5);
    newFov = Math.max(10, Math.min(185, newFov));
    this.setFov(newFov);
    
    if (this.onFovChange) {
      this.onFovChange(newFov);
    }
  };

  private updateCameraLook() {
    const altRad = this.cameraAltitude * Math.PI / 180.0;
    const azRad = this.cameraAzimuth * Math.PI / 180.0;

    const y = Math.sin(altRad);
    const z = -Math.cos(altRad) * Math.cos(azRad);
    const x = Math.cos(altRad) * Math.sin(azRad);

    this.camera.lookAt(x, y, z);
  }

  private onPointerDown = (e: PointerEvent) => {
    this.activePointers.set(e.pointerId, e);
    
    if (this.activePointers.size === 1) {
      this.isDragging = true;
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    } else if (this.activePointers.size === 2) {
      // 핀치 모드 시작
      this.isDragging = false; 
      this.lastPinchDistance = this.getPinchDistance();
    }
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.activePointers.has(e.pointerId)) return;
    this.activePointers.set(e.pointerId, e);

    // 핀치 줌 처리 (포인터 2개)
    if (this.activePointers.size === 2) {
      const currentDistance = this.getPinchDistance();
      if (this.lastPinchDistance !== null && currentDistance > 0) {
        const delta = currentDistance - this.lastPinchDistance;
        // 줌 감도: 거리 차이에 비례하여 FOV 조절
        let newFov = this.camera.fov - delta * (this.camera.fov / 500);
        newFov = Math.max(10, Math.min(185, newFov));
        
        if (Math.abs(newFov - this.camera.fov) > 0.01) {
          this.setFov(newFov);
          if (this.onFovChange) this.onFovChange(newFov);
        }
      }
      this.lastPinchDistance = currentDistance;
      return;
    }

    // 시점 회전 처리 (포인터 1개)
    if (this.isDragging && this.activePointers.size === 1) {
      const deltaX = e.clientX - this.previousMousePosition.x;
      const deltaY = e.clientY - this.previousMousePosition.y;
      this.previousMousePosition = { x: e.clientX, y: e.clientY };

      const degPerPixelY = this.camera.fov / this.domElement.clientHeight;
      const degPerPixelX = degPerPixelY; 

      this.cameraAzimuth += -deltaX * degPerPixelX;
      this.cameraAltitude += deltaY * degPerPixelY;

      this.cameraAzimuth = this.cameraAzimuth % 360;
      if (this.cameraAzimuth < 0) this.cameraAzimuth += 360;

      this.cameraAltitude = Math.max(-89.9, Math.min(89.9, this.cameraAltitude));

      this.updateCameraLook();
    }
  };

  private onPointerUp = (e: PointerEvent) => {
    this.activePointers.delete(e.pointerId);
    this.lastPinchDistance = null;

    if (this.activePointers.size === 0) {
      this.isDragging = false;
    } else if (this.activePointers.size === 1) {
      // 남은 하나의 포인트로 드래그 재개 준비
      const remaining = this.activePointers.values().next().value;
      if (remaining) {
        this.previousMousePosition = { x: remaining.clientX, y: remaining.clientY };
        this.isDragging = true;
      }
    }
  };

  private getPinchDistance(): number {
    const list = Array.from(this.activePointers.values());
    if (list.length < 2) return 0;
    
    const dx = list[0].clientX - list[1].clientX;
    const dy = list[0].clientY - list[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  public dispose() {
    this.domElement.removeEventListener('wheel', this.onWheel);
    this.domElement.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);
  }
}
