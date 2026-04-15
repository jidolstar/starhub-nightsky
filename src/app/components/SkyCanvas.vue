<template>
  <div class="sky-container">
    <!-- Left Sidebar for Console -->
    <div class="controls-sidebar">
      <h3>Starhub Nightsky</h3>

      <label>
        시야각(확대): {{ skyStore.fov }}&deg;
        <input type="range" min="10" max="185" v-model.number="skyStore.fov" />
      </label>
      <label>
        위도: {{ skyStore.lat.toFixed(2) }}&deg;
        <input type="range" min="-90" max="90" step="0.1" v-model.number="skyStore.lat" />
      </label>
      <label class="checkbox-label">
        <input type="checkbox" v-model="skyStore.showAzimuthalGrid" />
        방위좌표 격자 표시
      </label>
      <label class="checkbox-label">
        <input type="checkbox" v-model="skyStore.showEquatorialGrid" />
        적도좌표 격자 표시
      </label>
      <label class="checkbox-label">
        <input type="checkbox" v-model="skyStore.showLandscape" />
        지면 표시
      </label>
      <label class="checkbox-label">
        <input type="checkbox" v-model="skyStore.showCardinalDirections" />
        동서남북 표시
      </label>
      <label class="checkbox-label">
        <input type="checkbox" v-model="skyStore.showConstellationLines" />
        별자리 선 표시
      </label>
      <label class="checkbox-label">
        <input type="checkbox" v-model="skyStore.showConstellationLabels" />
        별자리 이름 표시
      </label>
      <label class="checkbox-label">
        <input type="checkbox" v-model="skyStore.showConstellationBoundaries" />
        별자리 경계선 표시
      </label>
      <div class="time-controls">
        시간 이동:
        <button @click="fastForward(1)">+1시간</button>
        <button @click="fastForward(24)">+1일</button>
        <button @click="fastForward(24 * 30)">+1개월</button>
      </div>
    </div>
      
    <!-- Right side for Map (Sky) -->
    <div class="sky-canvas-wrapper">
      <canvas ref="canvasRef" class="sky-canvas"></canvas>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { useSkyStore } from '../store/useSkyStore';
import { StarhubNightsky } from '../../starhub-nightsky';

const canvasRef = ref<HTMLCanvasElement | null>(null);
const skyStore = useSkyStore();
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
  });

  bindNightsky(instance);
  instance.loadDefaultStarCatalog().catch(() => {
    if (isDestroyed || nightsky !== instance) return;
    instance.loadMockStars(20000);
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
  ([showConstellationLines, showConstellationLabels, showConstellationBoundaries]) => {
    if (nightsky) {
      nightsky.setLayerVisibility({
        constellationLines: showConstellationLines,
        constellationLabels: showConstellationLabels,
        constellationBoundaries: showConstellationBoundaries,
      });
    }
  }
);

// Helpers for testing
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
  background: #091220;
}

.controls-sidebar {
  flex: 0 0 300px;
  width: 300px;
  box-sizing: border-box;
  background: rgba(15, 20, 30, 1);
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  padding: 24px 20px;
  color: white;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: 2px 0 10px rgba(0,0,0,0.5);
  z-index: 10;
}

.sky-canvas-wrapper {
  flex: 1 1 0;
  display: flex;
  position: relative;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.sky-canvas {
  display: block;
  width: 100%;
  height: 100%;
  min-width: 0;
}

.controls-sidebar h3 {
  margin: 0;
  font-size: 1.2rem;
  border-bottom: 1px solid rgba(255,255,255,0.2);
  padding-bottom: 12px;
  margin-bottom: 4px;
}

.controls-sidebar label,
.controls-sidebar .time-controls {
  display: flex;
  flex-direction: column;
  font-size: 0.95rem;
  gap: 6px;
}

.controls-sidebar label.checkbox-label {
  flex-direction: row;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.controls-sidebar input[type="range"] {
  width: 100%;
}

.controls-sidebar button {
  background: rgba(40, 60, 100, 0.8);
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  margin-top: 6px;
}

.controls-sidebar button:hover {
  background: rgba(60, 90, 150, 0.8);
}

@media (max-width: 700px) {
  .sky-container {
    flex-direction: column;
  }

  .controls-sidebar {
    flex: 0 0 auto;
    width: 100%;
    max-height: 42vh;
    overflow-y: auto;
    border-right: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding: 16px 20px;
    gap: 12px;
  }

  .sky-canvas-wrapper {
    flex: 1 1 0;
    width: 100%;
  }
}
</style>
