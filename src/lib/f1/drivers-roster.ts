/** Fallback name + team colour when OpenF1 is locked and meta missing. */
import type { RankDriverMeta } from "./rank";

/** 2024 race numbers (also valid for most 2025 entries). */
const ROSTER_2024: Record<
  number,
  { full_name: string; team_name: string; team_colour: string; code: string }
> = {
  1: {
    full_name: "Max VERSTAPPEN",
    team_name: "Red Bull Racing",
    team_colour: "3671C6",
    code: "VER",
  },
  2: {
    full_name: "Logan SARGEANT",
    team_name: "Williams",
    team_colour: "64C4FF",
    code: "SAR",
  },
  3: {
    full_name: "Daniel RICCIARDO",
    team_name: "RB",
    team_colour: "6692FF",
    code: "RIC",
  },
  4: {
    full_name: "Lando NORRIS",
    team_name: "McLaren",
    team_colour: "FF8000",
    code: "NOR",
  },
  10: {
    full_name: "Pierre GASLY",
    team_name: "Alpine",
    team_colour: "0093CC",
    code: "GAS",
  },
  11: {
    full_name: "Sergio PEREZ",
    team_name: "Red Bull Racing",
    team_colour: "3671C6",
    code: "PER",
  },
  14: {
    full_name: "Fernando ALONSO",
    team_name: "Aston Martin",
    team_colour: "229971",
    code: "ALO",
  },
  16: {
    full_name: "Charles LECLERC",
    team_name: "Ferrari",
    team_colour: "E80020",
    code: "LEC",
  },
  18: {
    full_name: "Lance STROLL",
    team_name: "Aston Martin",
    team_colour: "229971",
    code: "STR",
  },
  20: {
    full_name: "Kevin MAGNUSSEN",
    team_name: "Haas F1 Team",
    team_colour: "B6BABD",
    code: "MAG",
  },
  22: {
    full_name: "Yuki TSUNODA",
    team_name: "RB",
    team_colour: "6692FF",
    code: "TSU",
  },
  23: {
    full_name: "Alexander ALBON",
    team_name: "Williams",
    team_colour: "64C4FF",
    code: "ALB",
  },
  24: {
    full_name: "Zhou GUANYU",
    team_name: "Kick Sauber",
    team_colour: "52E252",
    code: "ZHO",
  },
  27: {
    full_name: "Nico HULKENBERG",
    team_name: "Haas F1 Team",
    team_colour: "B6BABD",
    code: "HUL",
  },
  31: {
    full_name: "Esteban OCON",
    team_name: "Alpine",
    team_colour: "0093CC",
    code: "OCO",
  },
  44: {
    full_name: "Lewis HAMILTON",
    team_name: "Mercedes",
    team_colour: "27F4D2",
    code: "HAM",
  },
  55: {
    full_name: "Carlos SAINZ",
    team_name: "Ferrari",
    team_colour: "E80020",
    code: "SAI",
  },
  63: {
    full_name: "George RUSSELL",
    team_name: "Mercedes",
    team_colour: "27F4D2",
    code: "RUS",
  },
  77: {
    full_name: "Valtteri BOTTAS",
    team_name: "Kick Sauber",
    team_colour: "52E252",
    code: "BOT",
  },
  81: {
    full_name: "Oscar PIASTRI",
    team_name: "McLaren",
    team_colour: "FF8000",
    code: "PIA",
  },
};

export function rosterMeta(): Map<number, RankDriverMeta> {
  const m = new Map<number, RankDriverMeta>();
  for (const [num, d] of Object.entries(ROSTER_2024)) {
    m.set(Number(num), {
      full_name: d.full_name,
      team_name: d.team_name,
      team_colour: d.team_colour,
      code: d.code,
    });
  }
  return m;
}

export function mergeMeta(
  base: Map<number, RankDriverMeta>,
  extra: Map<number, RankDriverMeta> | Iterable<[number, RankDriverMeta]>,
): Map<number, RankDriverMeta> {
  const out = new Map(base);
  for (const [k, v] of extra) {
    const prev = out.get(k) ?? {};
    out.set(k, {
      full_name: v.full_name || prev.full_name,
      team_name: v.team_name || prev.team_name,
      team_colour: (v.team_colour || prev.team_colour || "888888").replace(
        /^#/,
        "",
      ),
      code: v.code || prev.code,
    });
  }
  return out;
}
