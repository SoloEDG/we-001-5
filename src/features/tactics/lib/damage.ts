import type { Skill, Unit } from "../../../shared/types";
export function previewDamage(
  a: Unit,
  t: Unit,
  s: Skill,
  armor: number,
  cover: number,
  elevated: boolean,
  fireScale = 1,
) {
  if (s.target === "ally") return Math.min(s.power, t.maxHp - t.hp);
  if (s.target === "self") return 0;
  const base = a.power + s.power - armor - cover + (elevated ? 2 : 0);
  // 火焰伤害受积水状态影响：受潮目标减伤，冻伤目标更易被点燃。
  const scaled = s.element === "fire" ? base * fireScale : base;
  return Math.max(1, Math.round(scaled));
}
