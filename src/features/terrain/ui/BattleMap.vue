<script setup lang="ts">
import { computed } from "vue";
import type { Battle, Point } from "../../../shared/types";
import { key } from "../../../shared/document";
import {
  DAMP_DEPTH,
  SUBMERGED_DEPTH,
  depthAt,
} from "../../../shared/water";
import { terrainRules } from "../lib/cost";
const props = defineProps<{
  battle: Battle;
  selected: string;
  routes: string[];
  targets: string[];
  path: Point[];
  trailKind?: "move" | "flood" | null;
  /** 下一轮预测水深；回放或未启用天气时为 null。 */
  forecast: number[] | null;
  outlets: Point[];
}>();
defineEmits<{ cell: [point: Point] }>();
const depthOf = (p: Point) => depthAt(props.battle, p);
const forecastOf = (i: number) => props.forecast?.[i] ?? 0;
const isOutlet = (p: Point) =>
  props.outlets.some((o) => o.x === p.x && o.y === p.y);
const unitAt = (p: Point) =>
  props.battle.units.filter((u) => u.hp > 0 && key(u) === key(p));
const floodRise = (i: number, p: Point) => {
  if (!props.forecast) return 0;
  const here = forecastOf(i);
  return Math.max(0, here - depthOf(p));
};
const trail = computed(() => new Set(props.path.map(key)));
const isFloodTrail = computed(() => props.trailKind === "flood");
const cellClass = (tile: Point, i: number) => {
  const d = depthOf(tile);
  return {
    damp: d >= DAMP_DEPTH && d < SUBMERGED_DEPTH,
    submerged: d >= SUBMERGED_DEPTH,
    "predict-rise": !!props.forecast && floodRise(i, tile) >= 0.3,
    "predict-submerge":
      !!props.forecast &&
      d < SUBMERGED_DEPTH &&
      forecastOf(i) >= SUBMERGED_DEPTH,
    outlet: isOutlet(tile),
    reachable: props.routes.includes(key(tile)),
    target: props.targets.includes(key(tile)),
    trail: trail.value.has(key(tile)) && !isFloodTrail.value,
    "flood-trail": trail.value.has(key(tile)) && isFloodTrail.value,
  };
};
</script>
<template>
  <section class="map-frame">
    <div class="map-caption">
      <span>渡口 07 / 北部边境</span><span>12 × 8 · 四向网格</span>
    </div>
    <div class="battle-map" role="grid" aria-label="战术地图">
      <button
        v-for="(tile, i) in battle.tiles"
        :key="key(tile)"
        :data-cell="key(tile)"
        :class="['tile', tile.terrain, cellClass(tile, i)]"
        :aria-label="`${tile.x},${tile.y} ${terrainRules[tile.terrain].name} 积水${depthOf(tile).toFixed(1)}`"
        @click="$emit('cell', tile)"
      >
        <span class="ground">{{ terrainRules[tile.terrain].glyph }}</span>
        <span
          v-if="depthOf(tile) >= DAMP_DEPTH"
          class="flood"
          :style="{
            height: Math.min(70, depthOf(tile) * 22) + '%',
          }"
        />
        <template
          v-for="unit in unitAt(tile)"
          :key="unit.id"
          ><span
            :class="[
              'pawn',
              unit.team,
              {
                selected: unit.id === selected,
                active: unit.id === battle.active,
                wet: depthOf(tile) >= DAMP_DEPTH,
                drowned: depthOf(tile) >= SUBMERGED_DEPTH,
              },
            ]"
            >{{
              unit.job === "guard"
                ? "♜"
                : unit.job === "ranger"
                  ? "➶"
                  : unit.job === "mage"
                    ? "✦"
                    : "✚"
            }}<i
              :style="{
                width: (unit.hp / unit.maxHp) * 100 + '%',
              }" /></span
        ></template>
        <span v-if="isOutlet(tile)" class="outlet-mark" aria-hidden="true">⤓</span>
        <span
          v-if="floodRise(i, tile) >= 0.3"
          class="forecast-mark"
          :class="{ severe: forecastOf(i) >= SUBMERGED_DEPTH }"
          aria-hidden="true"
          >{{ forecastOf(i) >= SUBMERGED_DEPTH ? "≈" : "+" }}</span
        >
        <small>{{ tile.x + 1 }}·{{ tile.y + 1 }}</small>
      </button>
    </div>
    <div class="map-caption">
      <span>浅滩纵贯南北 · 中央石桥可快速渡河</span
      ><span>◇ 当前行动　● 可移动　◈ 技能目标　⤓ 排水口　+ 预测涨水</span>
    </div>
  </section>
</template>
