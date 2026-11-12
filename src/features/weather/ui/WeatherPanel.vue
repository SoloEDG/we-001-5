<script setup lang="ts">
import { computed } from "vue";
import type { Battle, Point } from "../../../shared/types";
import {
  RAIN_LEVELS,
  DAMP_DEPTH,
  SUBMERGED_DEPTH,
  depthAt,
} from "../../../shared/water";
import { rainLevel } from "../model/rules";
const props = defineProps<{
  battle: Battle;
  locked: boolean;
  outletMode: boolean;
  forecast: { newlyDamp: number; newlySubmerged: number } | null;
}>();
defineEmits<{
  rain: [value: number];
  toggle: [];
  outletMode: [on: boolean];
}>();
const weather = computed(() => props.battle.weather ?? null);
const level = computed(() => weather.value?.rain ?? 0);
const outletList = computed(() => weather.value?.outlets ?? []);
const wetCount = computed(
  () =>
    props.battle.units.filter(
      (u) => u.hp > 0 && depthAt(props.battle, u) >= DAMP_DEPTH,
    ).length,
);
const submergedCount = computed(
  () =>
    props.battle.units.filter(
      (u) => u.hp > 0 && depthAt(props.battle, u) >= SUBMERGED_DEPTH,
    ).length,
);
const forecastText = computed(() => {
  const f = props.forecast;
  if (!props.battle.weather) return "未启用天气";
  if (!f || props.locked) return "回放中 · 不重新预测";
  return `新增淹没 ${f.newlySubmerged} 格 · 新增受潮 ${f.newlyDamp} 格`;
});
const outletDepth = (p: Point) => depthAt(props.battle, p);
</script>
<template>
  <section class="panel weather-panel">
    <div class="eyebrow">05 / STORM FRONT</div>
    <h3>
      暴雨与积水
      <small>{{ weather ? rainLevel(level).name : "沿用旧规则" }}</small>
    </h3>
    <template v-if="weather">
      <div class="rain-levels" role="radiogroup" aria-label="降雨强度">
        <button
          v-for="item in RAIN_LEVELS"
          :key="item.value"
          :disabled="locked"
          :class="{ chosen: level === item.value }"
          :aria-checked="level === item.value"
          role="radio"
          @click="$emit('rain', item.value)"
        >
          <b>{{ item.name }}</b><small>{{ item.value }} 级</small>
        </button>
      </div>
      <p class="weather-hint">
        {{ rainLevel(level).detail }}。当前
        <b>{{ wetCount }}</b> 人受潮、<b>{{ submergedCount }}</b> 人淹没。
      </p>
      <div class="forecast-box">
        <span class="eyebrow">NEXT ROUND / 淹没预测</span>
        <p>{{ forecastText }}</p>
        <small>预测与实战共用同一份水位快照，所以预览与实际结算一致。</small>
      </div>
      <div class="outlet-box">
        <span class="eyebrow">OUTLETS / 排水口</span>
        <button
          :disabled="locked"
          :class="{ chosen: outletMode }"
          @click="$emit('outletMode', !outletMode)"
        >
          {{ outletMode ? "取消选择" : "设置排水口" }}
        </button>
        <small v-if="outletMode">点击地图空格增设或拆除排水口</small>
        <small v-else-if="!outletList.length">尚未设置排水口</small>
        <ul v-if="outletList.length">
          <li v-for="(o, i) in outletList" :key="`${o.x},${o.y}`">
            排水口 {{ i + 1 }} · ({{ o.x + 1 }},{{ o.y + 1 }})
            <em>积水 {{ outletDepth(o).toFixed(1) }}</em>
          </li>
        </ul>
        <small>改动只影响后续扩散，不回写已经提交的历史水位。</small>
      </div>
      <button class="ghost" :disabled="locked" @click="$emit('toggle')">
        关闭暴雨，回到旧规则
      </button>
    </template>
    <template v-else>
      <p class="weather-hint">
        当前战斗没有天气，移动消耗保持固定值，也不会产生积水扩散。旧战斗存档自动沿用此规则。
      </p>
      <button :disabled="locked" @click="$emit('toggle')">启用暴雨天气</button>
    </template>
  </section>
</template>
