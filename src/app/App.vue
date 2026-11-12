<script setup lang="ts">
import { computed } from "vue";
import { BattleMap, TerrainPanel } from "../features/terrain";
import { RosterPanel } from "../features/roster";
import { ActionPanel } from "../features/tactics";
import { TurnOrder } from "../features/initiative";
import { ReplayPanel, downloadArchive } from "../features/replay";
import { WeatherPanel } from "../features/weather";
import { key } from "../shared/document";
import { useWorkspace } from "./workspace";
const {
  session,
  cursor,
  selected,
  skill,
  brush,
  outletMode,
  notice,
  battle,
  actor,
  locked,
  routes,
  targets,
  path,
  trailKind,
  playback,
  forecast,
  rescue,
  fireScale,
  actorDepth,
  weather,
  outlets,
  depthInfo,
  rain,
  toggleWeather,
  cell,
  wait,
  seek,
  reset,
} = useWorkspace();
const forecastList = computed(() => forecast.value?.depth ?? null);
</script>
<template>
  <main>
    <header>
      <a class="brand" href="./"
        ><span class="brand-mark">⌘</span>
        <div>灰烬渡口<small>ASHEN CROSSING / TACTICS LAB</small></div></a
      >
      <nav>
        <span class="nav-active">战术指挥台</span
        ><span>{{ weather ? "暴雨预警 / 07" : "本地演练 / 07" }}</span>
      </nav>
      <button @click="reset">↻ 重新部署</button>
    </header>
    <div class="mission">
      <div>
        <div class="eyebrow">OPERATION 001 / 北境战役</div>
        <h1>在河岸，决定下一步。</h1>
        <p>利用地形，掌握先机。每一次行动，都有迹可循。</p>
      </div>
      <div class="live-badge">
        <i />{{ cursor < 0 ? "实战指挥" : "历史回放 · 只读"
        }}<small>消灭敌方所有角色获胜</small>
      </div>
    </div>
    <TurnOrder :battle="battle" />
    <div class="workspace">
      <aside>
        <RosterPanel
          :battle="battle"
          :selected="selected"
          :active="battle.active"
          @select="selected = $event"
        /><TerrainPanel
          :brush="brush"
          :locked="locked"
          @paint="
            brush = $event;
            skill = '';
            outletMode = false;
          "
        />
      </aside>
      <div class="center">
        <BattleMap
          :battle="battle"
          :selected="selected"
          :routes="[...routes.keys()]"
          :targets="targets.map(key)"
          :path="path"
          :trail-kind="trailKind"
          :forecast="forecastList"
          :outlets="outlets"
          @cell="cell"
        />
        <div class="field-note">
          <span>✦ 战场提示</span>
          <p v-if="weather">
            积水每轮按上一轮沉积分水位统一扩散；涉水移动 +1，淹没 +2 且需先支付脱困代价。
            火焰命中受潮目标衰减 60%，命中积水会蒸发部分水。
            <b>{{ depthInfo?.wetted ?? 0 }}</b> 人受潮、<b
              >{{ depthInfo?.submerged ?? 0 }}</b
            >
            人淹没。
          </p>
          <p v-else>
            密林提供 3 点掩护；高地攻击 +2；迟缓减少 2
            点移动；灼烧在自身行动结束时结算。
          </p>
        </div>
      </div>
      <aside>
        <ActionPanel
          :unit="actor"
          :skill="skill"
          :locked="locked"
          :notice="notice"
          :rescue="rescue"
          :depth="actorDepth"
          :fire-scale="fireScale"
          @skill="
            skill = $event;
            brush = null;
            outletMode = false;
          "
          @wait="wait"
        /><WeatherPanel
          :battle="battle"
          :locked="locked"
          :outlet-mode="outletMode"
          :forecast="forecast"
          @rain="rain"
          @toggle="toggleWeather"
          @outlet-mode="outletMode = $event"
        /><ReplayPanel
          :events="session.events"
          :cursor="cursor"
          :playing="playback.playing.value"
          @seek="seek"
          @play="playback.play(cursor)"
          @stop="playback.stop"
          @download="downloadArchive(session)"
        />
      </aside>
    </div>
    <footer>
      <span>WE–001 / TURN-BASED TACTICS</span
      ><span>自动保存于当前浏览器　·　全部运算在本地完成</span
      ><span>苍蓝军 <b>VS</b> 余烬军</span>
    </footer>
  </main>
</template>
