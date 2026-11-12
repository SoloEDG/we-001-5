import type { Battle, Point, Unit } from "../../../shared/types";
import { key } from "../../../shared/document";
import { depthAt } from "../../../shared/water";
import { movementCost, rescueCost } from "./cost";
export interface Route {
  cost: number;
  path: Point[];
  /** 是否在出发格支付了脱困代价。 */
  rescued: boolean;
}
export function reachable(
  b: Battle,
  u: Unit,
  budget: number,
): Map<string, Route> {
  const result = new Map<string, Route>([
    [key(u), { cost: 0, path: [], rescued: false }],
  ]);
  const escape = rescueCost(u, depthAt(b, u));
  // 脱困代价从第一格移动开始一次性计提；若连第一步都走不出预算，则只能原地待命。
  const pending: Point[] = [u];
  while (pending.length) {
    pending.sort((a, c) => result.get(key(a))!.cost - result.get(key(c))!.cost);
    const pos = pending.shift()!;
    const route = result.get(key(pos))!;
    for (const d of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const n = { x: pos.x + d[0], y: pos.y + d[1] };
      const tile = b.tiles.find((t) => key(t) === key(n));
      if (
        !tile ||
        b.units.some((v) => v.hp > 0 && v.id !== u.id && key(v) === key(n))
      )
        continue;
      const first = !route.path.length;
      const cost =
        route.cost +
        movementCost(tile.terrain, u, depthAt(b, n)) +
        (first ? escape : 0);
      if (cost > budget || cost >= (result.get(key(n))?.cost ?? Infinity))
        continue;
      result.set(key(n), {
        cost,
        path: [...route.path, n],
        rescued: route.rescued || (first && escape > 0),
      });
      pending.push(n);
    }
  }
  return result;
}
