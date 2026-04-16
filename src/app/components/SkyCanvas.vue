<template>
  <div class="sky-container">
    <!-- Mobile Toggle Button -->
    <button class="mobile-toggle-btn" @click="isPanelOpen = !isPanelOpen" aria-label="Toggle settings">
      <span v-if="!isPanelOpen">⚙️</span>
      <span v-else>✕</span>
    </button>

    <!-- Overlay Backdrop for Mobile -->
    <div v-if="isPanelOpen" class="mobile-backdrop" @click="isPanelOpen = false"></div>

    <!-- Sidebar for Console (Mobile: Bottom Sheet / Desktop: Sidebar) -->
    <div class="controls-sidebar" :class="{ 'is-open': isPanelOpen }">
      <div class="sidebar-header">
        <div class="title-with-version">
          <h3>Starhub Nightsky</h3>
          <span class="app-version">v{{ appVersion }}</span>
        </div>
        <button class="close-btn" @click="isPanelOpen = false">✕</button>
      </div>

      <div class="sidebar-content">
        <!-- 시야각 조절 -->
        <div class="control-group top-spacing">
          <label>
            <div class="label-header">
              <span>시야각(확대)</span>
              <span class="value">{{ skyStore.fov.toFixed(2) }}&deg;</span>
            </div>
            <input type="range" min="10" max="185" v-model.number="skyStore.fov" class="wide-range" />
          </label>
        </div>

        <!-- 위도 조절 -->
        <div class="control-group">
          <label>
            <div class="label-header">
              <span>위도</span>
              <span class="value">{{ skyStore.lat.toFixed(2) }}&deg;</span>
            </div>
            <input type="range" min="-90" max="90" step="0.1" v-model.number="skyStore.lat" class="wide-range" />
          </label>
        </div>

        <div class="checkbox-grid">
          <label class="checkbox-label">
            <input type="checkbox" v-model="skyStore.showAzimuthalGrid" />
            <span>방위좌표</span>
          </label>
          <label class="checkbox-label">
            <input type="checkbox" v-model="skyStore.showEquatorialGrid" />
            <span>적도좌표</span>
          </label>
          <label class="checkbox-label">
            <input type="checkbox" v-model="skyStore.showLandscape" />
            <span>지면</span>
          </label>
          <label class="checkbox-label">
            <input type="checkbox" v-model="skyStore.showCardinalDirections" />
            <span>방위값</span>
          </label>
          <label class="checkbox-label">
            <input type="checkbox" v-model="skyStore.showConstellationLines" />
            <span>별자리 선</span>
          </label>
          <label class="checkbox-label">
            <input type="checkbox" v-model="skyStore.showConstellationLabels" />
            <span>명칭</span>
          </label>
        </div>

        <div class="time-controls">
          <div class="time-header">시간 이동</div>
          <div class="time-button-groups">
             <div class="btn-row">
               <button class="minus" @click="fastForward(-1)">-1h</button>
               <button class="plus" @click="fastForward(1)">+1h</button>
             </div>
             <div class="btn-row">
               <button class="minus" @click="fastForward(-24)">-1d</button>
               <button class="plus" @click="fastForward(24)">+1d</button>
             </div>
             <div class="btn-row">
               <button class="minus" @click="fastForward(-24 * 30)">-1m</button>
               <button class="plus" @click="fastForward(24 * 30)">+1m</button>
             </div>
          </div>
        </div>

        <!-- 제작자 서명 -->
        <div class="sidebar-footer">
          Created by Ji Yong ho
        </div>
      </div>
    </div>
      
    <!-- Sky Map Canvas -->
    <div class="sky-canvas-wrapper" @click="isPanelOpen = false">
      <canvas ref="canvasRef" class="sky-canvas"></canvas>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { useSkyStore } from '../store/useSkyStore';
import { StarhubNightsky } from '../../starhub-nightsky';
import { version as appVersion } from '../../../package.json';

const canvasRef = ref<HTMLCanvasElement | null>(null);
const skyStore = useSkyStore();
const isPanelOpen = ref(false); // 패널 상태 추가
let nightsky: StarhubNightsky | null = null;
let isDestroyed = false;

const bindNightsky = (instance: StarhubNightsky) => {
  nightsky = instance;
  instance.setFovChangeCallback((newFov) => {
    skyStore.updateFov(newFov);
  });
  instance.start();
};

onMounted(() => {
  if (!canvasRef.value) return;

  const instance = new StarhubNightsky(canvasRef.value, {
    observer: { lat: skyStore.lat, lon: skyStore.lon },
    time: skyStore.currentTime,
    fov: skyStore.fov,
    layers: {
      azimuthalGrid: skyStore.showAzimuthalGrid,
      equatorialGrid: skyStore.showEquatorialGrid,
      landscape: skyStore.showLandscape,
      cardinalDirections: skyStore.showCardinalDirections,
      constellationLines: skyStore.showConstellationLines,
      constellationLabels: skyStore.showConstellationLabels,
      constellationBoundaries: skyStore.showConstellationBoundaries,
    },
    assetPath: `${import.meta.env.BASE_URL}assets/data/`,
  });

  bindNightsky(instance);
  
  instance.loadDefaultStarCatalog().catch(() => {
    if (isDestroyed || nightsky !== instance) return;
  });
});

onBeforeUnmount(() => {
  isDestroyed = true;
  if (nightsky) {
    nightsky.dispose();
    nightsky = null;
  }
});

// Sync store changes to Engine
watch(
  () => [skyStore.lat, skyStore.lon, skyStore.currentTime] as const,
  ([lat, lon, time]) => {
    if (nightsky) {
      nightsky.setObserver({ lat, lon }, time as Date);
    }
  },
  { deep: true }
);

watch(
  () => skyStore.fov,
  (newFov) => {
    if (nightsky) {
      nightsky.setFov(newFov);
    }
  }
);

watch(
  () => [skyStore.showAzimuthalGrid, skyStore.showEquatorialGrid] as const,
  ([showAz, showEq]) => {
    if (nightsky) {
      nightsky.setLayerVisibility({
        azimuthalGrid: showAz,
        equatorialGrid: showEq,
      });
    }
  }
);

watch(
  () => skyStore.showLandscape,
  (showLand) => {
    if (nightsky) {
      nightsky.setLandscapeVisible(showLand);
    }
  }
);

watch(
  () => skyStore.showCardinalDirections,
  (showCardinalDirections) => {
    if (nightsky) {
      nightsky.setCardinalDirectionsVisible(showCardinalDirections);
    }
  }
);

watch(
  () =>
    [
      skyStore.showConstellationLines,
      skyStore.showConstellationLabels,
      skyStore.showConstellationBoundaries,
    ] as const,
  ([showLines, showLabels, showBoundaries]) => {
    if (nightsky) {
      nightsky.setLayerVisibility({
        constellationLines: showLines,
        constellationLabels: showLabels,
        constellationBoundaries: showBoundaries,
      });
    }
  }
);

const fastForward = (hours: number) => {
  const newTime = new Date(skyStore.currentTime.getTime() + hours * 3600000);
  skyStore.updateTime(newTime);
};
</script>

<style scoped>
.sky-container {
  display: flex;
  flex-direction: row;
  width: 100vw;
  height: 100vh;
  min-width: 0;
  overflow: hidden;
  background: #050a14;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

/* Sidebar Styling */
.controls-sidebar {
  flex: 0 0 320px;
  width: 320px;
  box-sizing: border-box;
  background: rgba(10, 15, 25, 0.95);
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  padding: 0;
  color: white;
  display: flex;
  flex-direction: column;
  z-index: 100;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.sidebar-header {
  padding: 24px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.title-with-version {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.app-version {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.4);
  font-weight: 400;
  font-family: 'Inter', monospace;
}

.sidebar-content {
  padding: 24px 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow-y: auto;
  position: relative;
}

.sidebar-footer {
  margin-top: auto;
  padding-top: 20px;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.3);
  text-align: center;
  font-weight: 500;
  letter-spacing: 0.05em;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.control-group.top-spacing {
  margin-top: 10px;
}

.label-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
}

.label-header .value {
  color: #4facfe;
  font-weight: 600;
}

.wide-range {
  width: 100%;
  margin: 8px 0;
  cursor: pointer;
}

/* Checkbox Grid */
.checkbox-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin: 10px 0;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.85rem;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.05);
  padding: 12px 10px;
  border-radius: 8px;
  transition: background 0.2s;
}

.checkbox-label:hover {
  background: rgba(255, 255, 255, 0.1);
}

/* Time Controls */
.time-header {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 12px;
}

.time-button-groups {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.btn-row {
  display: flex;
  gap: 8px;
}

.btn-row button {
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 10px;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-row button.minus {
  color: #ff4d4d;
  background: rgba(255, 77, 77, 0.1);
  border-color: rgba(255, 77, 77, 0.2);
}

.btn-row button.plus {
  color: #4facfe;
  background: rgba(79, 172, 254, 0.1);
  border-color: rgba(79, 172, 254, 0.2);
}

.btn-row button:hover {
  filter: brightness(1.2);
  background: rgba(255, 255, 255, 0.15);
}

/* Close & Toggle Buttons */
.close-btn {
  display: none;
  background: none;
  border: none;
  color: white;
  font-size: 1.4rem;
  cursor: pointer;
}

.mobile-toggle-btn {
  display: none;
  position: fixed;
  top: 20px;
  left: 20px;
  width: 48px;
  height: 48px;
  border-radius: 24px;
  background: rgba(10, 15, 25, 0.8);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 1.2rem;
  z-index: 1000;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

/* Canvas Area */
.sky-canvas-wrapper {
  flex: 1;
  position: relative;
  background: black;
}

.sky-canvas {
  width: 100%;
  height: 100%;
}

/* Mobile Responsive */
@media (max-width: 700px) {
  .mobile-toggle-btn {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .controls-sidebar {
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    height: auto;
    max-height: 85vh;
    border-right: none;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    transform: translateY(100%);
    border-radius: 24px 24px 0 0;
    background: rgba(15, 20, 30, 0.85);
    backdrop-filter: blur(20px);
  }

  .controls-sidebar.is-open {
    transform: translateY(0);
  }

  .close-btn {
    display: block;
  }

  .mobile-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.4);
    z-index: 90;
    backdrop-filter: blur(2px);
  }

  .sidebar-header {
    padding: 20px 24px;
  }
  
  .sidebar-content {
    padding: 0 24px 44px;
    gap: 18px;
  }
}
</style>
