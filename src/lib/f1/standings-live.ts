/**
 * Championship standings — full season in 1–2 HTTP calls (Jolpica/Ergast).
 * OpenF1 session_result was rate-limited → only ~3–6 races counted.
 */

export type DriverStandingRow = {
  position: number;
  driver_number: number;
  full_name: string;
  team_name: string;
  team_colour: string;
  code: string;
  points: number;
  wins: number;
};

export type ConstructorStandingRow = {
  position: number;
  team_name: string;
  team_colour: string;
  points: number;
  wins: number;
};

/** Approximate team colours for UI badges. */
const TEAM_COLOUR: Record<string, string> = {
  mclaren: "FF8000",
  "red bull": "3671C6",
  redbull: "3671C6",
  ferrari: "E8002D",
  mercedes: "27F4D2",
  alpine: "FF87BC",
  "aston martin": "229971",
  astonmartin: "229971",
  williams: "64C4FF",
  "haas f1 team": "B6BABD",
  haas: "B6BABD",
  "rb f1 team": "6692FF",
  rb: "6692FF",
  "racing bulls": "6692FF",
  sauber: "52E252",
  "kick sauber": "52E252",
  alphatauri: "5E8FAA",
  "alfa romeo": "C92D4B",
};

function teamColour(name: string): string {
  const k = name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (TEAM_COLOUR[k]) return TEAM_COLOUR[k]!;
  for (const [key, col] of Object.entries(TEAM_COLOUR)) {
    if (k.includes(key) || key.includes(k)) return col;
  }
  return "888888";
}

/** Known race numbers when Ergast permanentNumber is missing/wrong. */
const CODE_NUM: Record<string, number> = {
  VER: 1,
  PER: 11,
  NOR: 4,
  PIA: 81,
  LEC: 16,
  SAI: 55,
  HAM: 44,
  RUS: 63,
  ALO: 14,
  STR: 18,
  GAS: 10,
  OCO: 31,
  ALB: 23,
  SAR: 2,
  COL: 43,
  TSU: 22,
  RIC: 3,
  LAW: 30,
  HUL: 27,
  MAG: 20,
  BOT: 77,
  ZHO: 24,
  BEA: 50,
  ANT: 12,
  DOO: 7,
  HAD: 6,
  BOR: 5,
};

async function getJson(url: string): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export async function fetchYearStandings(year: number): Promise<{
  drivers: DriverStandingRow[];
  teams: ConstructorStandingRow[];
  racesUsed: number;
}> {
  const [drvRaw, conRaw] = await Promise.all([
    getJson(`https://api.jolpi.ca/ergast/f1/${year}/driverStandings.json`),
    getJson(
      `https://api.jolpi.ca/ergast/f1/${year}/constructorStandings.json`,
    ),
  ]);

  let racesUsed = 0;
  const drivers: DriverStandingRow[] = [];

  try {
    const lists =
      (drvRaw as any)?.MRData?.StandingsTable?.StandingsLists ?? [];
    if (lists[0]) {
      racesUsed = Number(lists[0].round) || 0;
      for (const row of lists[0].DriverStandings ?? []) {
        const d = row.Driver ?? {};
        const c = row.Constructors?.[0] ?? {};
        const code = String(d.code || "").toUpperCase();
        const permanent = Number(d.permanentNumber);
        const byCode = CODE_NUM[code];
        const driver_number =
          byCode ??
          (Number.isFinite(permanent) && permanent > 0 ? permanent : 0);
        const team_name = String(c.name || "Unknown");
        drivers.push({
          position: Number(row.position) || drivers.length + 1,
          driver_number,
          full_name: `${d.givenName || ""} ${d.familyName || ""}`.trim() || code,
          team_name,
          team_colour: teamColour(team_name),
          code: code || String(driver_number),
          points: Number(row.points) || 0,
          wins: Number(row.wins) || 0,
        });
      }
    }
  } catch {
    /* */
  }

  const teams: ConstructorStandingRow[] = [];
  try {
    const lists =
      (conRaw as any)?.MRData?.StandingsTable?.StandingsLists ?? [];
    if (lists[0]) {
      if (!racesUsed) racesUsed = Number(lists[0].round) || 0;
      for (const row of lists[0].ConstructorStandings ?? []) {
        const c = row.Constructor ?? {};
        const team_name = String(c.name || "Unknown");
        teams.push({
          position: Number(row.position) || teams.length + 1,
          team_name,
          team_colour: teamColour(team_name),
          points: Number(row.points) || 0,
          wins: Number(row.wins) || 0,
        });
      }
    }
  } catch {
    /* */
  }

  // Fallback constructors from drivers if API empty
  if (teams.length === 0 && drivers.length > 0) {
    const bag = new Map<
      string,
      { team_name: string; team_colour: string; points: number; wins: number }
    >();
    for (const d of drivers) {
      const cur = bag.get(d.team_name) ?? {
        team_name: d.team_name,
        team_colour: d.team_colour,
        points: 0,
        wins: 0,
      };
      cur.points += d.points;
      cur.wins += d.wins;
      bag.set(d.team_name, cur);
    }
    teams.push(
      ...[...bag.values()]
        .sort((a, b) => b.points - a.points || b.wins - a.wins)
        .map((t, i) => ({
          position: i + 1,
          ...t,
          points: Math.round(t.points * 10) / 10,
        })),
    );
  }

  return { drivers, teams, racesUsed };
}
