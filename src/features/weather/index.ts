import WeatherPanel from "./ui/WeatherPanel.vue";
import {
  RAIN_LEVELS,
  applyWaterStatuses,
  commitFlood,
  computeNextDepth,
  createWeather,
  depthAt,
  depthAtIndex,
  forecastFlood,
  isSubmerged,
} from "../../shared/water";

export { WeatherPanel };
export {
  RAIN_LEVELS,
  applyWaterStatuses,
  commitFlood,
  computeNextDepth,
  createWeather,
  depthAt,
  depthAtIndex,
  forecastFlood,
  isSubmerged,
};
export {
  enableWeather,
  disableWeather,
  setRain,
  toggleOutlet,
  isOutlet,
  forecastAt,
  rainLevel,
} from "./model/rules";
