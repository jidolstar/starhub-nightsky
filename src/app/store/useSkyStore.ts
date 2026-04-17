import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useSkyStore = defineStore('sky', () => {
  // Default: Seoul (Lat: 37.5665, Lon: 126.9780)
  const lat = ref(37.5665);
  const lon = ref(126.9780);
  
  const currentTime = ref(new Date());
  
  const fov = ref(185);
  
  const showAzimuthalGrid = ref(false);
  const showEquatorialGrid = ref(true);
  const showLandscape = ref(true);
  const showCardinalDirections = ref(true);
  const showConstellationLines = ref(true);
  const showConstellationLabels = ref(true);
  const showConstellationBoundaries = ref(false);
  const showSkymap = ref(true);
  

  const updateTime = (date: Date) => {
    currentTime.value = date;
  };
  
  const updateLocation = (newLat: number, newLon: number) => {
    lat.value = newLat;
    lon.value = newLon;
  };

  const updateFov = (newFov: number) => {
    fov.value = newFov;
  };



  return {
    lat,
    lon,
    currentTime,
    fov,
    showAzimuthalGrid,
    showEquatorialGrid,
    showLandscape,
    showCardinalDirections,
    showConstellationLines,
    showConstellationLabels,
    showConstellationBoundaries,
    showSkymap,
    updateTime,
    updateLocation,
    updateFov
  };
});
