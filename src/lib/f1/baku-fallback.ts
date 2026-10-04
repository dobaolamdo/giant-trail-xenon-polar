/**
 * Azerbaijan GP 2026 Race (session_key 11377) — kết quả chính thức.
 * Dùng khi OpenF1 bị lock (session live khác) hoặc DB chưa pump.
 */
import type { RankedRow, RankDriverMeta } from "./rank";

export const BAKU_RACE_KEY = 11377;

const META: [number, string, string, string, string][] = [
  // num, full_name, team, colour, code
  [63, "George Russell", "Mercedes", "27F4D2", "RUS"],
  [3, "Max Verstappen", "Red Bull Racing", "3671C6", "VER"],
  [6, "Isack Hadjar", "Racing Bulls", "6692FF", "HAD"],
  [16, "Charles Leclerc", "Ferrari", "E8002D", "LEC"],
  [12, "Andrea Kimi Antonelli", "Mercedes", "27F4D2", "ANT"],
  [44, "Lewis Hamilton", "Ferrari", "E8002D", "HAM"],
  [41, "Franco Colapinto", "Alpine", "FF87BC", "COL"],
  [31, "Esteban Ocon", "Haas F1 Team", "B6BABD", "OCO"],
  [87, "Oliver Bearman", "Haas F1 Team", "B6BABD", "BEA"],
  [55, "Carlos Sainz", "Williams", "64C4FF", "SAI"],
  [27, "Nico Hulkenberg", "Kick Sauber", "52E252", "HUL"],
  [30, "Liam Lawson", "Racing Bulls", "6692FF", "LAW"],
  [81, "Oscar Piastri", "McLaren", "FF8000", "PIA"],
  [11, "Sergio Perez", "Red Bull Racing", "3671C6", "PER"],
  [5, "Gabriel Bortoleto", "Kick Sauber", "52E252", "BOR"],
  [77, "Valtteri Bottas", "Kick Sauber", "52E252", "BOT"],
  [43, "Franco Colapinto", "Alpine", "FF87BC", "COL"],
  [10, "Pierre Gasly", "Alpine", "FF87BC", "GAS"],
  [1, "Max Verstappen", "Red Bull Racing", "3671C6", "VER"],
  [23, "Alexander Albon", "Williams", "64C4FF", "ALB"],
  [14, "Fernando Alonso", "Aston Martin", "229971", "ALO"],
  [18, "Lance Stroll", "Aston Martin", "229971", "STR"],
];

/** Official order: P1–15 classified, then DNF by laps remaining */
const ORDER: {
  num: number;
  pos: number | null;
  laps: number;
  pts?: number;
  gap?: number | null;
  dnf?: boolean;
  name?: string;
  team?: string;
  colour?: string;
  code?: string;
}[] = [
  { num: 63, pos: 1, laps: 51, pts: 25, gap: 0 },
  { num: 3, pos: 2, laps: 51, pts: 18, gap: 0.196 },
  { num: 6, pos: 3, laps: 51, pts: 15, gap: 10.704 },
  { num: 16, pos: 4, laps: 51, pts: 12, gap: 14.136 },
  { num: 12, pos: 5, laps: 51, pts: 10, gap: 14.512 },
  { num: 44, pos: 6, laps: 51, pts: 8, gap: 22.382 },
  { num: 41, pos: 7, laps: 51, pts: 6, gap: 31.159 },
  { num: 31, pos: 8, laps: 51, pts: 4, gap: 31.189 },
  { num: 87, pos: 9, laps: 51, pts: 2, gap: 31.929 },
  { num: 55, pos: 10, laps: 51, pts: 1, gap: 32.416 },
  { num: 27, pos: 11, laps: 51, pts: 0, gap: 33.231 },
  { num: 30, pos: 12, laps: 51, pts: 0, gap: 34.013 },
  { num: 81, pos: 13, laps: 51, pts: 0, gap: 36.401 },
  { num: 11, pos: 14, laps: 51, pts: 0, gap: 41.4 },
  { num: 5, pos: 15, laps: 51, pts: 0, gap: 44.23 },
  { num: 77, pos: null, laps: 49, dnf: true },
  { num: 10, pos: null, laps: 35, dnf: true, name: "Pierre Gasly", team: "Alpine", colour: "FF87BC", code: "GAS" },
  { num: 23, pos: null, laps: 29, dnf: true, name: "Alexander Albon", team: "Williams", colour: "64C4FF", code: "ALB" },
  { num: 14, pos: null, laps: 20, dnf: true, name: "Fernando Alonso", team: "Aston Martin", colour: "229971", code: "ALO" },
  { num: 18, pos: null, laps: 7, dnf: true, name: "Lance Stroll", team: "Aston Martin", colour: "229971", code: "STR" },
];

function metaMap(): Map<number, RankDriverMeta> {
  const m = new Map<number, RankDriverMeta>();
  for (const [num, full_name, team_name, team_colour, code] of META) {
    m.set(num, { full_name, team_name, team_colour, code });
  }
  return m;
}

export function bakuFallbackBoard(): RankedRow[] {
  const meta = metaMap();
  return ORDER.map((r, i) => {
    const m = meta.get(r.num);
    const isDnf = Boolean(r.dnf || r.pos == null);
    return {
      live_rank: isDnf ? i + 1 : (r.pos ?? i + 1),
      driver_number: r.num,
      full_name: r.name ?? m?.full_name ?? `#${r.num}`,
      team_name: r.team ?? m?.team_name ?? "",
      team_colour: (r.colour ?? m?.team_colour ?? "888888").replace(/^#/, ""),
      gap_to_leader: isDnf ? null : r.gap ?? null,
      gap_to_car_ahead: null,
      last_lap: null,
      status: isDnf ? ("DNF" as const) : null,
      position_change: 0,
      code: r.code ?? m?.code,
      points: r.pts,
      laps_completed: r.laps,
    };
  });
}

export function bakuFallbackDrivers(): Map<number, RankDriverMeta> {
  return metaMap();
}
