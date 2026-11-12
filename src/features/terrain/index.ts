export { default as BattleMap } from "./ui/BattleMap.vue";
export { default as TerrainPanel } from "./ui/TerrainPanel.vue";
export { createMap, paintTile, tileAt } from "./model/map";
export { reachable } from "./lib/paths";
export { terrainRules, rescueCost } from "./lib/cost";
