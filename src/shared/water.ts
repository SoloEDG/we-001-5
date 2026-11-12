import type {
  Battle,
  Point,
  Profession,
  Terrain,
  Tile,
  Unit,
  WeatherConfig,
  WeatherState,
} from "./types";
import { key } from "./document";

/** 地图固定为 12 × 8，tiles 与水深数组都按 y*12+x 的顺序存放。 */
export const GRID_WIDTH = 12;
export const GRID_HEIGHT = 8;
export const TILE_COUNT = GRID_WIDTH * GRID_HEIGHT;
export const tileIndex = (p: Point) => p.y * GRID_WIDTH + p.x;
export const pointAt = (i: number): Point => ({
  x: i % GRID_WIDTH,
  y: Math.floor(i / GRID_WIDTH),
});

/** 水面高度基准：越高越先退水。断崖不透水，也不蓄水。 */
export const terrainElevation: Record<Terrain, number> = {
  plain: 1,
  forest: 0.8,
  water: 0,
  ridge: 2.4,
  wall: 3.2,
};
/** 降雨截留比例：密林树冠会挡下一部分雨，浅滩几乎全收。 */
const rainRetention: Record<Terrain, number> = {
  plain: 1,
  forest: 0.7,
  water: 1.35,
  ridge: 0.25,
  wall: 0,
};
/** 每轮土壤自然下渗量：无雨时积水会缓慢退去。 */
const soilDrain: Record<Terrain, number> = {
  plain: 0.45,
  forest: 0.3,
  water: 0.15,
  ridge: 0.5,
  wall: 0,
};
export const RAIN_GAIN_PER_LEVEL = 0.3;
export const MAX_DEPTH = 3;
export const OUTLET_DRAIN = 2.5;
/** 特征水深阈值，供移动、火焰与状态判定共同使用。 */
export const DAMP_DEPTH = 0.3;
export const SUBMERGED_DEPTH = 1;
export const FROST_DEPTH = 1.6;
export const INITIAL_RIVER_DEPTH = 0.8;
/** 从淹没格脱身时首步的额外代价，按职业负担区分。 */
export const escapeCost: Record<Profession, number> = {
  guard: 3,
  ranger: 1,
  mage: 2,
  medic: 2,
};
export const RAIN_LEVELS = [
  { value: 0, name: "无雨", detail: "积水自然下渗、缓慢退去" },
  { value: 1, name: "小雨", detail: "低洼处开始积水" },
  { value: 2, name: "中雨", detail: "草原与浅滩持续上涨" },
  { value: 3, name: "暴雨", detail: "每轮扩散明显加快" },
  { value: 4, name: "洪雨", detail: "全场受潮，低地迅速淹没" },
] as const;

const clampDepth = (d: number) => Math.min(MAX_DEPTH, Math.max(0, d));
const EPS = 0.05;
const FLOW_RATE = 0.45;
const MIN_FLOW = 0.02;

export function createWeather(
  tiles: Tile[],
  config: Partial<WeatherConfig> = {},
): WeatherState {
  // 用坐标索引查找地形，避免依赖 tiles 数组的排列顺序。
  const terrainOf = terrainAt(tiles);
  const depth = Array.from({ length: TILE_COUNT }, (_, i) =>
    terrainOf(i) === "water" ? INITIAL_RIVER_DEPTH : 0,
  );
  return {
    rain: Math.min(4, Math.max(0, Math.round(config.rain ?? 2))),
    outlets: (config.outlets ?? []).map((p) => ({ ...p })),
    depth,
  };
}

/** 兼容旧存档：补齐缺失深度、约束降雨等级并过滤非法排水口。 */
export function ensureWeatherState(
  b: Battle,
): WeatherState | undefined {
  if (!b.weather) return undefined;
  const depth = Array.from(
    { length: TILE_COUNT },
    (_, i) => b.weather!.depth[i] ?? 0,
  );
  b.weather.depth = depth;
  b.weather.rain = Math.min(4, Math.max(0, Math.round(b.weather.rain)));
  b.weather.outlets = b.weather.outlets.filter(
    (p) =>
      Number.isFinite(p?.x) &&
      Number.isFinite(p?.y) &&
      p.x >= 0 &&
      p.x < GRID_WIDTH &&
      p.y >= 0 &&
      p.y < GRID_HEIGHT,
  );
  return b.weather;
}

export const depthAtIndex = (b: Battle, i: number) =>
  b.weather?.depth[i] ?? 0;

export function depthAt(b: Battle, p: Point) {
  return b.weather ? b.weather.depth[tileIndex(p)] ?? 0 : 0;
}


const terrainAt = (tiles: Tile[]) => {
  const map = new Map<number, Terrain>();
  for (const tile of tiles) map.set(tileIndex(tile), tile.terrain);
  return (i: number): Terrain => map.get(i) ?? "plain";
};

export interface FloodForecast {
  depth: number[];
  /** 本轮结束时由干转潮/由潮转淹的格子数。 */
  newlyDamp: number;
  newlySubmerged: number;
}

/**
 * 计算下一轮的完整水位。
 *
 * 关键约束：所有流量方向与可流出的水量都只读取“上一轮已提交”的完整水深快照，
 * 计算结果先累积到 next，最后才统一生效。因此循环遍历地图的方向
 * 不会改变结果，也不会出现“刚修改了邻格又拿它继续算”的连锁误差。
 *
 * 该函数是一轮一次的有界运算，不存在反复迭代到收敛的循环；即使地图形成
 * 封闭洼地或环形水道，也只会进行一次扩散计算，不会让页面卡死。
 */
export function computeNextDepth(b: Battle): number[] | null {
  const weather = b.weather;
  if (!weather) return null;
  const prev = weather.depth;
  const terrainOf = terrainAt(b.tiles);
  const prevAt = (i: number) => prev[i] ?? 0;
  const base = Array.from({ length: TILE_COUNT }, (_, i) => {
    const terrain = terrainOf(i);
    // 断崖不蓄水：把地形改成断崖只会切断水流，不会保留旧水。
    if (terrain === "wall") return 0;
    return clampDepth(
      prevAt(i) +
        weather.rain * RAIN_GAIN_PER_LEVEL * rainRetention[terrain] -
        soilDrain[terrain],
    );
  });
  const next = base.slice();

  type Flow = { from: number; to: number; amount: number };
  const flows: Flow[] = [];
  const outflow = new Array<number>(TILE_COUNT).fill(0);

  // 每对相邻格只处理一次。方向由“上一轮水面高度”决定，
  // 两个方向不会同时出水；结果只写入 next，不回头读 next。
  for (let i = 0; i < TILE_COUNT; i++) {
    const x = i % GRID_WIDTH;
    for (const d of [1, GRID_WIDTH]) {
      const j = i + d;
      if (j < 0 || j >= TILE_COUNT) continue;
      if (d === 1 && x === GRID_WIDTH - 1) continue;
      const terrainI = terrainOf(i),
        terrainJ = terrainOf(j);
      if (terrainI === "wall" || terrainJ === "wall") continue;

      const surfaceI = terrainElevation[terrainI] + prevAt(i);
      const surfaceJ = terrainElevation[terrainJ] + prevAt(j);
      const diff = surfaceI - surfaceJ;
      if (Math.abs(diff) <= EPS) continue;
      const from = diff > 0 ? i : j;
      const to = diff > 0 ? j : i;
      const available = Math.max(0, base[from] - MIN_FLOW);
      if (available <= 0) continue;
      const amount = Math.min(
        Math.abs(diff) * FLOW_RATE,
        available * 0.45,
      );
      if (amount < MIN_FLOW) continue;
      flows.push({ from, to, amount });
      outflow[from] += amount;
    }
  }

  // 一个格子可能有多个出水方向；按它本轮可动用的水量统一缩放，
  // 避免同一格的水被重复借出。缩放同样只依赖本轮快照，
  // 因而仍与遍历顺序无关。
  for (const flow of flows) {
    const available = Math.max(0, base[flow.from] - MIN_FLOW);
    const scale =
      outflow[flow.from] > available ? available / outflow[flow.from] : 1;
    if (scale <= 0) continue;
    const amount = flow.amount * scale;
    if (amount < MIN_FLOW) continue;
    next[flow.from] -= amount;
    next[flow.to] += amount;
  }

  // 排水口只对“本轮扩散完成后仍停留在该格”的水量生效。
  // 修改排水口参数不会回写任何已经提交的历史水位。
  for (const p of weather.outlets) {
    if (
      p.x < 0 ||
      p.x >= GRID_WIDTH ||
      p.y < 0 ||
      p.y >= GRID_HEIGHT
    )
      continue;
    const i = tileIndex(p);
    const terrain = terrainOf(i);
    if (terrain === "wall") continue;
    next[i] = Math.max(0, next[i] - OUTLET_DRAIN);
  }

  return next.map(clampDepth);
}

export function forecastFlood(b: Battle): FloodForecast | null {
  const depth = computeNextDepth(b);
  if (!depth) return null;
  let newlyDamp = 0,
    newlySubmerged = 0;
  for (let i = 0; i < TILE_COUNT; i++) {
    const before = depthAtIndex(b, i),
      after = depth[i];
    if (before < DAMP_DEPTH && after >= DAMP_DEPTH) newlyDamp++;
    if (before < SUBMERGED_DEPTH && after >= SUBMERGED_DEPTH)
      newlySubmerged++;
  }
  return { depth, newlyDamp, newlySubmerged };
}

export interface FloodSummary {
  rain: number;
  newlyDamp: number;
  newlySubmerged: number;
  outletCount: number;
  /** 本轮水深发生变化的格子，用于回放时高亮扩散轨迹。 */
  changed: Point[];
}

/**
 * 回合结束时提交水位，并给站在水中的角色挂受潮/冻伤。
 * 角色永远不会被水推走：这里只改水深与状态，不改坐标。
 */
export function commitFlood(b: Battle): FloodSummary | null {
  const weather = ensureWeatherState(b);
  if (!weather) return null;
  const depth = computeNextDepth(b);
  if (!depth) return null;
  const before = weather.depth.slice();
  weather.depth = depth;
  let newlyDamp = 0,
    newlySubmerged = 0;
  const changed: Point[] = [];
  for (let i = 0; i < TILE_COUNT; i++) {
    if (before[i] < DAMP_DEPTH && depth[i] >= DAMP_DEPTH) newlyDamp++;
    if (before[i] < SUBMERGED_DEPTH && depth[i] >= SUBMERGED_DEPTH)
      newlySubmerged++;
    if (Math.abs(depth[i] - before[i]) >= 0.1) changed.push(pointAt(i));
  }
  applyWaterStatuses(b);
  return {
    rain: weather.rain,
    newlyDamp,
    newlySubmerged,
    outletCount: weather.outlets.length,
    changed,
  };
}

function refreshStatus(u: Unit, kind: "wet" | "frostbite") {
  u.statuses = u.statuses.filter((s) => s.kind !== kind);
  u.statuses.push({ kind, turns: 2 });
}

/**
 * 按角色当前脚下方格刷新受潮/冻伤。
 * 移动后立即调用，让“走进水里”和“走出积水”马上体现在状态栏与伤害计算上；
 * 回合末再统一调用一次，覆盖因为水位扩散而被淹的角色。
 */
export function updateUnitWaterStatus(b: Battle, u: Unit) {
  if (!b.weather || u.hp <= 0) return;
  const depth = depthAt(b, u);
  const wet = depth >= DAMP_DEPTH;
  if (!wet) u.statuses = u.statuses.filter((s) => s.kind !== "wet");
  else refreshStatus(u, "wet");
  // 深水必然冻伤；暴雨把浅水也压到接近冰点，淹没格同样会冻伤。
  const icy =
    depth >= FROST_DEPTH ||
    (b.weather.rain >= 4 && wet) ||
    (b.weather.rain >= 3 && depth >= SUBMERGED_DEPTH);
  if (icy) refreshStatus(u, "frostbite");
}

export function applyWaterStatuses(b: Battle) {
  if (!b.weather) return;
  for (const u of b.units) updateUnitWaterStatus(b, u);
}

/** 角色是否处于需要支付脱困代价的淹没格。 */
export function isSubmerged(b: Battle, u: Unit) {
  return depthAt(b, u) >= SUBMERGED_DEPTH;
}


/** 排水口只能落在可以积水的格子。 */
export function canOutlet(b: Battle, p: Point) {
  const tile = b.tiles.find((t) => key(t) === key(p));
  return !!tile && tile.terrain !== "wall";
}
