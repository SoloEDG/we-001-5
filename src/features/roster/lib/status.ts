import type { Status, Unit } from "../../../shared/types";
export function moveBudget(u: Unit) {
  const slow = u.statuses.some((s) => s.kind === "slow") ? 2 : 0;
  const frost = u.statuses.some((s) => s.kind === "frostbite") ? 1 : 0;
  return Math.max(1, u.move - slow - frost);
}
export function armorValue(u: Unit) {
  return u.armor + (u.statuses.some((s) => s.kind === "guard") ? 4 : 0);
}
/** 受潮会让火焰伤害打折扣；冻伤又会削弱耐热。 */
export function fireMultiplier(u: Unit) {
  let value = u.statuses.some((s) => s.kind === "wet") ? 0.6 : 1;
  if (u.statuses.some((s) => s.kind === "frostbite")) value *= 1.35;
  return value;
}
export function tickStatuses(u: Unit) {
  for (const s of u.statuses) {
    if (s.kind === "burn") {
      // 受潮会显著削弱灼烧。
      const damage = u.statuses.some((v) => v.kind === "wet") ? 1 : 3;
      u.hp = Math.max(0, u.hp - damage);
    }
  }
  u.statuses = u.statuses
    .map((s) => ({ ...s, turns: s.turns - 1 }))
    .filter((s) => s.turns > 0);
}
export const statusNames: Record<Status["kind"], string> = {
  slow: "迟缓",
  burn: "灼烧",
  guard: "防御",
  wet: "受潮",
  frostbite: "冻伤",
};
