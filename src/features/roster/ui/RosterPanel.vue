<script setup lang="ts">
import type { Battle, Unit } from "../../../shared/types";
import { professions } from "../model/professions";
import { statusNames } from "../lib/status";
import {
  depthAt,
  DAMP_DEPTH,
  SUBMERGED_DEPTH,
  escapeCost,
} from "../../../shared/water";
const props = defineProps<{
  battle: Battle;
  selected: string;
  active: string;
}>();
defineEmits<{ select: [id: string] }>();
const units = () => props.battle.units;
const alive = () => units().filter((u) => u.hp > 0).length;
const waterTone = (u: Unit) => {
  const d = depthAt(props.battle, u);
  return d >= SUBMERGED_DEPTH ? "submerged" : d >= DAMP_DEPTH ? "damp" : "";
};
const statusText = (u: Unit) => {
  const names = u.statuses.map((s) => statusNames[s.kind] + s.turns);
  const depth = depthAt(props.battle, u);
  if (depth >= DAMP_DEPTH) names.push(`积水${depth.toFixed(1)}`);
  return names.join(" ") || "状态正常";
};
const settleCost = (u: Unit) =>
  u.statuses.some((s) => s.kind === "wet") &&
  depthAt(props.battle, u) >= SUBMERGED_DEPTH
    ? escapeCost[u.job]
    : null;
</script>
<template>
  <section class="panel roster-panel">
    <div class="eyebrow">02 / COMBAT SQUAD</div>
    <h3>战场编队 <small>{{ alive() }} 名存活</small></h3>
    <button
      v-for="u in battle.units"
      :key="u.id"
      :data-unit="u.id"
      :class="[
        'unit-row',
        u.team,
        waterTone(u),
        { chosen: u.id === selected, dead: u.hp <= 0 },
      ]"
      @click="$emit('select', u.id)"
    >
      <span class="avatar">{{ u.name.slice(0, 1) }}</span
      ><span class="unit-name"
        ><b
          >{{ u.name }} <i v-if="u.id === active">行动中</i>
          <em v-if="waterTone(u)" :class="['water-tag', waterTone(u)]">{{
            waterTone(u) === "submerged" ? "淹没" : "受潮"
          }}</em></b
        ><small
          >{{ professions[u.job].name }} ·
          {{ u.team === "azure" ? "苍蓝" : "余烬" }}</small
        ><span class="hp-track"
          ><i :style="{ width: (u.hp / u.maxHp) * 100 + '%' }" /></span></span
      ><span class="hp-value"
        >{{ u.hp }}<small>/{{ u.maxHp }}</small
        ><small>{{ statusText(u) }}</small
        ><small v-if="settleCost(u)">脱困代价 +{{ settleCost(u) }}</small></span
      >
    </button>
  </section>
</template>
