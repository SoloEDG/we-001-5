import type { Session } from "../../../shared/types";
import { assertBattle } from "../../../shared/document";
import { ensureWeatherState } from "../../../shared/water";
export function saveArchive(s: Session) {
  localStorage.setItem("we001-session", JSON.stringify(s));
}
export function loadArchive(): Session | null {
  try {
    const raw = localStorage.getItem("we001-session");
    if (!raw) return null;
    const s = JSON.parse(raw) as Session;
    assertBattle(s.live);
    assertBattle(s.initial);
    // 旧存档没有 weather 字段时保持 undefined，规则仍按无天气运行；
    // 有天气的存档则补齐可能缺失的深度项，避免数组越界。
    ensureWeatherState(s.live);
    ensureWeatherState(s.initial);
    for (const e of s.events) {
      ensureWeatherState(e.before);
      ensureWeatherState(e.after);
    }
    if (!Array.isArray(s.events)) return null;
    return s;
  } catch {
    return null;
  }
}
export function downloadArchive(s: Session) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(s, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "灰烬渡口-战斗记录.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
