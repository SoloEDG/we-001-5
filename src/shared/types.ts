export type Terrain = "plain" | "forest" | "water" | "ridge" | "wall";
export type Profession = "guard" | "ranger" | "mage" | "medic";
export interface Point {
  x: number;
  y: number;
}
export interface Tile extends Point {
  terrain: Terrain;
}
export interface Status {
  kind: "slow" | "burn" | "guard" | "wet" | "frostbite";
  turns: number;
}
/**
 * 气候参数。rain 为 0–4 的降雨强度；outlets 为排水口坐标。
 * 参数只参与“下一轮”扩散计算，不会重算已经提交的水位。
 */
export interface WeatherConfig {
  rain: number;
  outlets: Point[];
}
/**
 * 完整气候状态。depth 按 12×8 网格顺序保存每一格的积水深度；
 * 没有 weather 的旧战斗维持原有的无天气规则。
 */
export interface WeatherState extends WeatherConfig {
  depth: number[];
}
export interface Unit extends Point {
  id: string;
  name: string;
  job: Profession;
  team: "azure" | "ember";
  hp: number;
  maxHp: number;
  power: number;
  armor: number;
  speed: number;
  move: number;
  statuses: Status[];
  moved: boolean;
  acted: boolean;
}
export interface Battle {
  tiles: Tile[];
  units: Unit[];
  round: number;
  queue: string[];
  active: string;
  ended: string | null;
  /** 可选：没有该字段的旧战斗按无天气规则运行。 */
  weather?: WeatherState;
}
export type EventKind =
  | "move"
  | "skill"
  | "wait"
  | "terrain"
  | "weather"
  | "flood";
export interface BattleEvent {
  id: number;
  kind: EventKind;
  actor: string;
  label: string;
  path: Point[];
  before: Battle;
  after: Battle;
}
export interface Session {
  initial: Battle;
  live: Battle;
  events: BattleEvent[];
}
export interface Skill {
  id: string;
  name: string;
  range: number;
  power: number;
  target: "enemy" | "ally" | "self";
  status?: Status["kind"];
  element?: "fire";
  description: string;
}
