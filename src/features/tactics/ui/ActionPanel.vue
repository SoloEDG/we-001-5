<script setup lang="ts">
import type { Unit } from "../../../shared/types";
import { skillBook } from "../model/skills";
defineProps<{
  unit: Unit;
  skill: string;
  locked: boolean;
  notice: string;
  rescue: { job: string; cost: number; label: string } | null;
  depth: number;
  fireScale: number;
}>();
defineEmits<{ skill: [id: string]; wait: [] }>();
</script>
<template>
  <section class="panel action-panel">
    <div class="eyebrow">03 / TACTICAL ORDERS</div>
    <h3>
      {{ unit.name }}的指令
      <small
        >{{ unit.moved ? "已移动" : "可移动" }} /
        {{ unit.acted ? "已施法" : "可施法" }}</small
      >
    </h3>
    <p class="instruction">
      点击蓝色格移动；选择技能后点击目标。双方均由你指挥。
    </p>
    <p v-if="depth > 0" class="water-readout">
      脚下积水 {{ depth.toFixed(1) }}
      <em v-if="rescue">{{ rescue.label }}</em>
      <em v-if="fireScale < 1">火焰伤害 ×{{ fireScale.toFixed(2) }}</em>
    </p>
    <div class="skills">
      <button
        v-for="s in skillBook[unit.job]"
        :key="s.id"
        :disabled="locked || unit.acted"
        :class="{ chosen: skill === s.id }"
        @click="$emit('skill', skill === s.id ? '' : s.id)"
      >
        <span
          >{{ s.name }} <small>距离 {{ s.range }}</small></span
        ><small>{{ s.description }}</small>
      </button>
    </div>
    <button class="primary end-turn" :disabled="locked" @click="$emit('wait')">
      结束行动 <span>→</span>
    </button>
    <p class="notice" role="status">{{ notice }}</p>
  </section>
</template>
