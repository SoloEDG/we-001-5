import type { Session, Battle } from "../shared/types";
import { clone } from "../shared/document";
import { createMap } from "../features/terrain";
import { createWeather } from "../shared/water";
import { createUnits } from "../features/roster";
import { order } from "../features/initiative";
export function newSession(): Session {
  const tiles = createMap();
  const live: Battle = {
    tiles,
    units: createUnits(),
    round: 1,
    queue: [],
    active: "",
    ended: null,
    weather: createWeather(tiles, { rain: 2, outlets: [{ x: 6, y: 3 }] }),
  };
  live.queue = order(live);
  live.active = live.queue[0];
  return { initial: clone(live), live, events: [] };
}
