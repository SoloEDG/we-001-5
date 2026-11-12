import type { Battle, Point } from "../../../shared/types";
import { key } from "../../../shared/document";
import {
  RAIN_LEVELS,
  canOutlet,
  computeNextDepth,
  createWeather,
  depthAt,
  tileIndex,
  updateUnitWaterStatus,
} from "../../../shared/water";

/** 部署阶段开启天气：立即生成当前水位快照，但不会给任何人挂状态。 */
export function enableWeather(b: Battle, rain = 2) {
  if (b.weather) return;
  b.weather = createWeather(b.tiles, { rain });
  for (const u of b.units) updateUnitWaterStatus(b, u);
}
export function disableWeather(b: Battle) {
  b.weather = undefined;
  // 关闭天气后，受潮/冻伤不再有环境来源，一并清理，回到原规则。
  for (const u of b.units)
    u.statuses = u.statuses.filter(
      (s) => s.kind !== "wet" && s.kind !== "frostbite",
    );
}
/** 修改降雨强度只影响后续扩散；已提交的 depth 数组原样保留。 */
export function setRain(b: Battle, rain: number) {
  if (!b.weather) return;
  b.weather.rain = Math.min(4, Math.max(0, Math.round(rain)));
}
export function toggleOutlet(b: Battle, p: Point) {
  if (!b.weather) throw new Error("当前战斗未启用天气");
  if (!canOutlet(b, p)) throw new Error("断崖无法设置排水口");
  const id = key(p);
  const existing = b.weather.outlets.findIndex((o) => key(o) === id);
  if (existing >= 0) {
    b.weather.outlets.splice(existing, 1);
    return false;
  }
  b.weather.outlets.push({ ...p });
  return true;
}
export function isOutlet(b: Battle, p: Point) {
  return !!b.weather?.outlets.some((o) => key(o) === key(p));
}
/** 预测中某格下一轮的水位；与实战提交共用同一个纯函数。 */
export function forecastAt(b: Battle, p: Point) {
  const depth = computeNextDepth(b);
  return depth ? depth[tileIndex(p)] : depthAt(b, p);
}
export function rainLevel(rain: number) {
  return RAIN_LEVELS[Math.min(4, Math.max(0, rain))] ?? RAIN_LEVELS[0];
}
