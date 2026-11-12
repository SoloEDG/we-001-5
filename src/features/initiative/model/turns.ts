import type { Battle } from "../../../shared/types";
import { findUnit } from "../../../shared/document";
import { order, outcome } from "../lib/order";
export interface TurnEnd {
  /** 本轮是否已经走完，水位扩散应在此时提交。 */
  roundEnded: boolean;
}
/**
 * 结束当前角色的行动。水位扩散不在这里提交，
 * 而是由调用方在本轮最后一名角色结束后统一执行，
 * 以保证“先算完整上一轮水位、再一次性提交”。
 * 无天气的旧战斗不会进入这段流程，规则与从前一致。
 */
export function finishTurn(
  b: Battle,
  tick: (u: ReturnType<typeof findUnit>) => void,
): TurnEnd {
  tick(findUnit(b, b.active));
  b.queue = b.queue.filter((id) => id !== b.active && findUnit(b, id).hp > 0);
  b.ended = outcome(b);
  if (b.ended) return { roundEnded: false };
  if (!b.queue.length) {
    b.round++;
    b.queue = order(b);
    for (const u of b.units) {
      u.moved = false;
      u.acted = false;
    }
    b.active = b.queue[0];
    b.ended = outcome(b);
    return { roundEnded: !b.ended };
  }
  b.active = b.queue[0];
  return { roundEnded: false };
}
