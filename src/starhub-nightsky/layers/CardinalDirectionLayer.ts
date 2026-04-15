import * as THREE from 'three';

type CardinalKey = 'N' | 'E' | 'S' | 'W';

interface MarkerElement {
  root: HTMLDivElement;
}

/**
 * 정북/정동/정남/정서 표시를 별지도 내부 레이어로 관리합니다.
 * Vue/Pinia에 의존하지 않고 canvas 부모에 DOM 오버레이를 직접 붙입니다.
 */
export class CardinalDirectionLayer {
  private readonly canvas: HTMLCanvasElement;
  private readonly overlay: HTMLDivElement;
  private readonly markers: Record<CardinalKey, MarkerElement>;
  private readonly directions: Record<CardinalKey, THREE.Vector3> = {
    N: new THREE.Vector3(0, 0, -1),
    E: new THREE.Vector3(1, 0, 0),
    S: new THREE.Vector3(0, 0, 1),
    W: new THREE.Vector3(-1, 0, 0),
  };

  private readonly order: CardinalKey[] = ['N', 'E', 'S', 'W'];
  private readonly dotRadius = 3.5;
  private parentElement: HTMLElement | null = null;
  private didSetParentPosition = false;
  private visible = true;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.overlay = document.createElement('div');
    this.overlay.setAttribute('aria-hidden', 'true');
    this.applyOverlayStyle();

    this.markers = {
      N: this.createMarker('N'),
      E: this.createMarker('E'),
      S: this.createMarker('S'),
      W: this.createMarker('W'),
    };

    this.mount();
  }

  /**
   * 방향 표시 레이어의 표시 여부를 변경합니다.
   */
  public setVisible(visible: boolean): void {
    this.visible = visible;
    this.overlay.style.display = visible ? 'block' : 'none';
  }

  /**
   * 카메라 상태에 맞춰 방향 표시의 화면 위치를 갱신합니다.
   */
  public update(camera: THREE.PerspectiveCamera): void {
    if (!this.visible || !this.parentElement) return;

    const rect = this.overlay.getBoundingClientRect();
    if (
      rect.width <= 0 ||
      rect.height <= 0 ||
      !Number.isFinite(camera.aspect) ||
      camera.aspect <= 0
    ) {
      this.hideAllMarkers();
      return;
    }

    camera.updateMatrixWorld(true);

    const inverseQuaternion = camera.quaternion.clone().invert();
    const fovScale = 1 / Math.tan(THREE.MathUtils.degToRad(camera.fov) / 4);
    const margin = 40;

    for (const key of this.order) {
      const viewDirection = this.directions[key].clone().applyQuaternion(inverseQuaternion).normalize();
      const fade = 1 - this.clamp((viewDirection.z - 0.55) / 0.35, 0, 1);

      if (fade <= 0.01) {
        this.hideMarker(key);
        continue;
      }

      const denom = 1 - viewDirection.z;
      if (denom <= 0.03) {
        this.hideMarker(key);
        continue;
      }

      const ndcX = ((viewDirection.x / denom) * fovScale) / camera.aspect;
      const ndcY = (viewDirection.y / denom) * fovScale;
      const screenX = (ndcX * 0.5 + 0.5) * rect.width;
      const screenY = (-ndcY * 0.5 + 0.5) * rect.height;

      if (
        !Number.isFinite(screenX) ||
        !Number.isFinite(screenY) ||
        screenX < -margin ||
        screenX > rect.width + margin ||
        screenY < -margin ||
        screenY > rect.height + margin
      ) {
        this.hideMarker(key);
        continue;
      }

      this.showMarker(key, screenX, screenY, fade);
    }
  }

  /**
   * 레이어가 생성한 DOM 노드를 정리합니다.
   */
  public dispose(): void {
    this.overlay.remove();

    if (this.parentElement && this.didSetParentPosition) {
      this.parentElement.style.position = '';
    }
  }

  private mount(): void {
    const parent = this.canvas.parentElement;
    if (!parent) return;

    this.parentElement = parent;
    if (window.getComputedStyle(parent).position === 'static') {
      parent.style.position = 'relative';
      this.didSetParentPosition = true;
    }

    parent.appendChild(this.overlay);
  }

  private applyOverlayStyle(): void {
    Object.assign(this.overlay.style, {
      position: 'absolute',
      inset: '0',
      pointerEvents: 'none',
      zIndex: '11',
      overflow: 'hidden',
    });
  }

  private createMarker(key: CardinalKey): MarkerElement {
    const root = document.createElement('div');
    const dot = document.createElement('span');
    const letter = document.createElement('span');

    letter.textContent = key;

    Object.assign(root.style, {
      position: 'absolute',
      transform: 'translateX(-50%)',
      display: 'none',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '4px',
      color: 'rgba(255, 226, 226, 0.96)',
      textShadow: '0 0 3px rgba(0, 0, 0, 0.95), 0 0 10px rgba(0, 0, 0, 0.8)',
      letterSpacing: '0',
      whiteSpace: 'nowrap',
      userSelect: 'none',
    });

    Object.assign(dot.style, {
      width: '7px',
      height: '7px',
      borderRadius: '50%',
      background: 'rgba(255, 192, 192, 0.98)',
      boxShadow: '0 0 6px rgba(255, 120, 120, 0.7), 0 0 0 1px rgba(255, 205, 205, 0.25)',
    });

    Object.assign(letter.style, {
      display: 'block',
      fontSize: '16px',
      fontWeight: '700',
      lineHeight: '1',
    });

    root.append(dot, letter);
    this.overlay.appendChild(root);

    return { root };
  }

  private showMarker(key: CardinalKey, x: number, y: number, opacity: number): void {
    const marker = this.markers[key].root;
    marker.style.display = 'flex';
    marker.style.left = `${x}px`;
    marker.style.top = `${y - this.dotRadius}px`;
    marker.style.opacity = `${opacity}`;
  }

  private hideMarker(key: CardinalKey): void {
    const marker = this.markers[key].root;
    marker.style.display = 'none';
    marker.style.opacity = '0';
  }

  private hideAllMarkers(): void {
    for (const key of this.order) {
      this.hideMarker(key);
    }
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }
}
