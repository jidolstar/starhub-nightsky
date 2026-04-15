import * as THREE from 'three';

export class CameraController {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private onFovChange?: (newFov: number) => void;

  private cameraAzimuth: number = 180; // Start looking South
  private cameraAltitude: number = 0;  // Horizon
  private isDragging: boolean = false;
  private previousMousePosition = { x: 0, y: 0 };

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
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);

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
    this.isDragging = true;
    this.previousMousePosition = { x: e.clientX, y: e.clientY };
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.isDragging) return;

    const deltaX = e.clientX - this.previousMousePosition.x;
    const deltaY = e.clientY - this.previousMousePosition.y;
    this.previousMousePosition = { x: e.clientX, y: e.clientY };

    const degPerPixelY = this.camera.fov / this.domElement.clientHeight;
    const degPerPixelX = degPerPixelY; 

    // Moving mouse left pulls sky left -> camera looks right (Azimuth +)
    this.cameraAzimuth += -deltaX * degPerPixelX;
    
    // Moving mouse down pulls sky down -> camera looks up (Altitude +)
    this.cameraAltitude += deltaY * degPerPixelY;

    this.cameraAzimuth = this.cameraAzimuth % 360;
    if (this.cameraAzimuth < 0) this.cameraAzimuth += 360;

    this.cameraAltitude = Math.max(-89.9, Math.min(89.9, this.cameraAltitude));

    this.updateCameraLook();
  };

  private onPointerUp = () => {
    this.isDragging = false;
  };

  public dispose() {
    this.domElement.removeEventListener('wheel', this.onWheel);
    this.domElement.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
  }
}
