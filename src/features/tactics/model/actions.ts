import type { Battle, Point, Skill } from "../../../shared/types";
import { findUnit } from "../../../shared/document";
import {
  DAMP_DEPTH,
  depthAt,
  tileIndex,
  updateUnitWaterStatus,
} from "../../../shared/water";
import { fireMultiplier } from "../../roster/lib/status";
import { legalTargets } from "../lib/targeting";
import { previewDamage } from "../lib/damage";
export function moveUnit(b: Battle, id: string, path: Point[]) {
  const u = findUnit(b, id);
  if (u.moved || u.acted || !path.length) throw new Error("本次行动无法移动");
  Object.assign(u, path[path.length - 1]);
  u.moved = true;
  // 移动后立刻按新脚下水位更新受潮/冻伤，后续火焰伤害与脱困判断都以此为准。
  updateUnitWaterStatus(b, u);
}
/** 火焰命中积水时蒸发的深度，最多蒸发到干格。 */
const EVAPORATION = 0.6;
export function castSkill(
  b: Battle,
  id: string,
  target: string,
  s: Skill,
  armor: number,
  cover: number,
  elevated: boolean,
) {
  const u = findUnit(b, id),
    t = findUnit(b, target);
  if (u.acted || !legalTargets(b, u, s).some((v) => v.id === target))
    throw new Error("目标不合法");
  const value = previewDamage(
    u,
    t,
    s,
    armor,
    cover,
    elevated,
    s.element === "fire" ? fireMultiplier(t) : 1,
  );
  t.hp =
    s.target === "ally"
      ? Math.min(t.maxHp, t.hp + value)
      : Math.max(0, t.hp - value);
  if (s.status && t.hp > 0) {
    t.statuses = t.statuses.filter((v) => v.kind !== s.status);
    t.statuses.push({ kind: s.status, turns: 2 });
  }
  // 火焰落在积水上会蒸发部分水；水面与地形分离，水深变化只影响后续扩散。
  if (s.element === "fire" && b.weather) {
    const i = tileIndex(t);
    const depth = depthAt(b, t);
    if (depth >= DAMP_DEPTH)
      b.weather.depth[i] = Math.max(0, depth - EVAPORATION);
  }
  u.acted = true;
  return value;
}
