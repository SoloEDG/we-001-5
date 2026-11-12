import type { Terrain, Unit } from "../../../shared/types";
import {
  DAMP_DEPTH,
  SUBMERGED_DEPTH,
  escapeCost,
} from "../../../shared/water";
export const terrainRules: Record<
  Terrain,
  { name: string; cost: number; cover: number; glyph: string }
> = {
  plain: { name: "草原", cost: 1, cover: 0, glyph: "·" },
  forest: { name: "密林", cost: 2, cover: 3, glyph: "♠" },
  water: { name: "浅滩", cost: 3, cover: 0, glyph: "≈" },
  ridge: { name: "高地", cost: 2, cover: 1, glyph: "△" },
  wall: { name: "断崖", cost: Infinity, cover: 0, glyph: "▰" },
};
/** 积水会额外增加移动消耗：受潮 +1，淹没再 +1。 */
export function movementCost(t: Terrain, u: Unit, depth = 0) {
  const base = t === "water" && u.job === "ranger" ? 2 : terrainRules[t].cost;
  if (depth >= SUBMERGED_DEPTH) return base + 2;
  if (depth >= DAMP_DEPTH) return base + 1;
  return base;
}
/** 从淹没格脱身时，第一步额外支付按职业区分的代价，之后即可正常移动。 */
export function rescueCost(u: Unit, startDepth: number) {
  return startDepth >= SUBMERGED_DEPTH ? escapeCost[u.job] : 0;
}
