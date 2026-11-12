import { computed, reactive, ref } from "vue";
import type { Battle, Point, Terrain } from "../shared/types";
import { clone, findUnit, key } from "../shared/document";
import {
  DAMP_DEPTH,
  SUBMERGED_DEPTH,
  commitFlood,
  depthAt,
  forecastFlood,
  isSubmerged,
} from "../shared/water";
import {
  reachable,
  terrainRules,
  paintTile,
  rescueCost,
} from "../features/terrain";
import { moveBudget, armorValue, tickStatuses } from "../features/roster";
import { fireMultiplier } from "../features/roster";
import {
  getSkill,
  legalTargets,
  moveUnit,
  castSkill,
} from "../features/tactics";
import { finishTurn } from "../features/initiative";
import {
  RAIN_LEVELS,
  enableWeather,
  disableWeather,
  setRain,
  toggleOutlet,
} from "../features/weather";
import {
  record,
  frame,
  loadArchive,
  saveArchive,
  usePlayback,
} from "../features/replay";
import { newSession } from "./session";
export function useWorkspace() {
  const session = reactive(loadArchive() ?? newSession());
  const cursor = ref(-1),
    selected = ref(session.live.active),
    skill = ref(""),
    brush = ref<Terrain | null>(null),
    outletMode = ref(false),
    notice = ref("选择蓝色格移动，或选择技能指定目标。");
  const playback = usePlayback(
    () => session.events.length,
    (n) => {
      cursor.value = n;
    },
  );
  const battle = computed(() => frame(session, cursor.value));
  const actor = computed(() => findUnit(battle.value, battle.value.active));
  const locked = computed(() => cursor.value >= 0 || !!session.live.ended);
  const routes = computed(() =>
    locked.value || actor.value.moved || actor.value.acted
      ? new Map()
      : reachable(session.live, actor.value, moveBudget(actor.value)),
  );
  const targets = computed(() => {
    const s = getSkill(actor.value.job, skill.value);
    return s ? legalTargets(battle.value, actor.value, s) : [];
  });
  /** 下一轮淹没预测；回放时不做预测，避免用当前参数改写历史画面。 */
  const forecast = computed(() =>
    locked.value ? null : forecastFlood(battle.value),
  );
  const actorDepth = computed(() => depthAt(battle.value, actor.value));
  const rescue = computed(() => {
    const u = actor.value;
    const submerged = actorDepth.value >= SUBMERGED_DEPTH;
    return submerged
      ? {
          job: u.job,
          cost: rescueCost(u, actorDepth.value),
          label: `从淹没格脱身，首步额外消耗 ${rescueCost(u, actorDepth.value)}`,
        }
      : null;
  });
  const fireScale = computed(() => fireMultiplier(actor.value));
  // 面板读取当前显示帧的天气，回放时展示的是那一轮的真实参数。
  const weather = computed(() => battle.value.weather ?? null);
  const outlets = computed(() => weather.value?.outlets ?? []);
  function commitWeather(label: string, before: Battle) {
    record(session, before, "weather", label);
    notice.value = label;
    saveArchive(session);
  }
  function rain(value: number) {
    try {
      if (locked.value) throw new Error("回放只读，请返回实战");
      if (!session.live.weather)
        throw new Error("当前战斗未启用暴雨，请先开启");
      if (session.live.weather.rain === value) return;
      const before = clone(session.live);
      setRain(session.live, value);
      commitWeather(
        `降雨调整为${RAIN_LEVELS[value]?.name ?? value}级`,
        before,
      );
    } catch (e) {
      notice.value = (e as Error).message;
    }
  }
  function toggleWeather() {
    try {
      if (locked.value) throw new Error("回放只读，请返回实战");
      const before = clone(session.live);
      if (session.live.weather)
        disableWeather(session.live);
      else enableWeather(session.live, 2);
      commitWeather(
        session.live.weather ? "部署暴雨天气" : "关闭暴雨天气",
        before,
      );
    } catch (e) {
      notice.value = (e as Error).message;
    }
  }
  function outlet(p: Point) {
    try {
      if (locked.value) throw new Error("回放只读，请返回实战");
      const before = clone(session.live);
      const added = toggleOutlet(session.live, p);
      commitWeather(
        `${added ? "增设" : "拆除"}排水口 (${p.x + 1},${p.y + 1})`,
        before,
      );
    } catch (e) {
      notice.value = (e as Error).message;
    }
  }
  function cell(p: Point) {
    try {
      if (locked.value) throw new Error("回放只读，请返回实战");
      if (outletMode.value) {
        outlet(p);
        return;
      }
      const before = clone(session.live),
        u = actor.value;
      if (brush.value) {
        paintTile(session.live, p, brush.value);
        record(
          session,
          before,
          "terrain",
          `地形调整为${terrainRules[brush.value].name}`,
        );
      } else if (skill.value) {
        const s = getSkill(u.job, skill.value)!;
        const t = session.live.units.find((t) => t.hp > 0 && key(t) === key(p));
        if (!t) throw new Error("请点击合法角色");
        const ground = session.live.tiles.find((v) => key(v) === key(t))!;
        const high =
          session.live.tiles.find((v) => key(v) === key(u))!.terrain ===
          "ridge";
        const value = castSkill(
          session.live,
          u.id,
          t.id,
          s,
          armorValue(t),
          terrainRules[ground.terrain].cover,
          high,
        );
        record(
          session,
          before,
          "skill",
          `${u.name} → ${t.name} · ${s.name} ${value}`,
        );
        skill.value = "";
      } else {
        const route = routes.value.get(key(p));
        if (!route?.path.length)
          throw new Error(
            rescue.value
              ? `${rescue.value.label}，本次行动无法走出`
              : "此格不可达，请检查地形与占位",
          );
        moveUnit(session.live, u.id, route.path);
        record(
          session,
          before,
          "move",
          `${u.name}移动 · 消耗${route.cost}${route.rescued ? "（含脱困）" : ""}`,
          route.path,
        );
      }
      saveArchive(session);
      notice.value = session.events.at(-1)!.label;
    } catch (e) {
      notice.value = (e as Error).message;
    }
  }
  function wait() {
    if (locked.value) return;
    const before = clone(session.live);
    const name = findUnit(before, before.active).name;
    const roundNo = before.round;
    const ended = finishTurn(session.live, tickStatuses);
    record(session, before, "wait", `${name}结束行动`);
    if (ended.roundEnded) {
      // 水位扩散独立成一条事件：回放能把每一轮的扩散变化单独展示出来。
      const floodBefore = clone(session.live);
      const summary = commitFlood(session.live);
      if (summary) {
        record(
          session,
          floodBefore,
          "flood",
          `第${roundNo}轮暴雨扩散 · 新增淹没${summary.newlySubmerged}格 · 受潮${summary.newlyDamp}格`,
          summary.changed,
        );
      }
    }
    selected.value = session.live.active;
    skill.value = "";
    outletMode.value = false;
    const flood = session.events.at(-1);
    notice.value =
      flood?.kind === "flood"
        ? flood.label
        : session.live.ended
          ? `${session.live.ended === "azure" ? "苍蓝军" : "余烬军"}获胜`
          : `轮次未结束 · 水位将在全部角色行动后统一扩散${
              session.live.weather ? "" : "（当前未启用天气）"
            }`;
    saveArchive(session);
  }
  function seek(n: number) {
    playback.stop();
    cursor.value = n;
    skill.value = "";
    brush.value = null;
    outletMode.value = false;
  }
  function reset() {
    playback.stop();
    Object.assign(session, newSession());
    cursor.value = -1;
    selected.value = session.live.active;
    skill.value = "";
    brush.value = null;
    outletMode.value = false;
    saveArchive(session);
    notice.value = "新战斗已就绪 · 默认中雨，可在此调整降雨与排水口";
  }
  const path = computed(() =>
    cursor.value > 0 ? (session.events[cursor.value - 1]?.path ?? []) : [],
  );
  /** 回放高亮语义：移动轨迹与洪水扩散需要不同的颜色。 */
  const trailKind = computed(() => {
    if (cursor.value <= 0) return null;
    const kind = session.events[cursor.value - 1]?.kind;
    return kind === "move" || kind === "flood" ? kind : null;
  });
  const depthInfo = computed(() => {
    const b = battle.value;
    if (!b.weather) return null;
    return {
      wetted: b.units.filter(
        (u) => u.hp > 0 && depthAt(b, u) >= DAMP_DEPTH,
      ).length,
      submerged: b.units.filter(
        (u) => u.hp > 0 && isSubmerged(b, u),
      ).length,
    };
  });
  return {
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
  };
}
