/** Real driver/constructor points from OpenF1 session_result (official). */

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

/** Race session_keys used by pump workflow. */
const RACE_KEYS: Record<number, number[]> = {
  2023: [
    7953, 7779, 7787, 9070, 9078, 9094, 9102, 9110, 9118, 9126, 9133, 9141,
    9149, 9157, 9165, 9173, 9221, 9213, 9181, 9205, 9189, 9197,
  ],
  2024: [
    9472, 9480, 9488, 9496, 9673, 9507, 9515, 9523, 9531, 9539, 9550, 9558,
    9566, 9574, 9582, 9590, 9598, 9606, 9617, 9625, 9636, 9644, 9655, 9662,
  ],
  2025: [
    9693, 9998, 10006, 10014, 10022, 10033, 9987, 9979, 9971, 9963, 9955, 9947,
    9939, 9928, 9920, 9912, 9904, 9896, 9888, 9877, 9869, 9858, 9850, 9839,
  ],
  2026: [
    11234, 11245, 11253, 11261, 11269, 11280, 11291, 11299, 11307, 11315, 11326,
    11334, 11342, 11353, 11361, 11369, 11377, 11731, 11388, 11396, 11404, 11412,
    11420, 11428, 11436,
  ],
};

async function getJson(url: string): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 25000);
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

type Acc = {
  driver_number: number;
  full_name: string;
  team_name: string;
  team_colour: string;
  code: string;
  points: number;
  wins: number;
};

/** Parallel with limit. */
async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]!);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );
  return out;
}

export async function fetchYearStandings(year: number): Promise<{
  drivers: DriverStandingRow[];
  teams: ConstructorStandingRow[];
  racesUsed: number;
}> {
  const keys = RACE_KEYS[year] ?? [];
  const bag = new Map<number, Acc>();
  let racesUsed = 0;

  const results = await mapPool(keys, 4, async (sessionKey) => {
    const [sr, drivers] = await Promise.all([
      getJson(
        `https://api.openf1.org/v1/session_result?session_key=${sessionKey}`,
      ),
      getJson(
        `https://api.openf1.org/v1/drivers?session_key=${sessionKey}`,
      ),
    ]);
    return { sessionKey, sr, drivers };
  });

  for (const { sr, drivers } of results) {
    if (!Array.isArray(sr) || sr.length === 0) continue;
    // only count if at least one classified with points or position
    const hasResult = sr.some(
      (r: any) => r.position != null || (r.points != null && Number(r.points) > 0),
    );
    if (!hasResult) continue;
    racesUsed++;

    const meta = new Map<
      number,
      { name: string; team: string; colour: string; code: string }
    >();
    if (Array.isArray(drivers)) {
      for (const d of drivers as any[]) {
        if (d.driver_number == null) continue;
        meta.set(Number(d.driver_number), {
          name: String(d.full_name || d.broadcast_name || `#${d.driver_number}`),
          team: String(d.team_name || "Unknown"),
          colour: String(d.team_colour || "888888").replace(/^#/, ""),
          code: String(d.name_acronym || d.driver_number),
        });
      }
    }

    for (const r of sr as any[]) {
      const num = Number(r.driver_number);
      if (!num) continue;
      const pts = Number(r.points ?? 0) || 0;
      const pos = r.position != null ? Number(r.position) : null;
      const m = meta.get(num);
      const cur =
        bag.get(num) ??
        ({
          driver_number: num,
          full_name: m?.name ?? `#${num}`,
          team_name: m?.team ?? "Unknown",
          team_colour: m?.colour ?? "888888",
          code: m?.code ?? String(num),
          points: 0,
          wins: 0,
        } satisfies Acc);
      if (m) {
        cur.full_name = m.name;
        cur.team_name = m.team;
        cur.team_colour = m.colour;
        cur.code = m.code;
      }
      cur.points += pts;
      if (pos === 1 && !r.dnf && !r.dsq && !r.dns) cur.wins += 1;
      bag.set(num, cur);
    }
  }

  const drivers: DriverStandingRow[] = [...bag.values()]
    .sort((a, b) => b.points - a.points || b.wins - a.wins)
    .map((d, i) => ({
      position: i + 1,
      driver_number: d.driver_number,
      full_name: d.full_name,
      team_name: d.team_name,
      team_colour: d.team_colour,
      code: d.code,
      points: Math.round(d.points * 10) / 10,
      wins: d.wins,
    }));

  const teamBag = new Map<
    string,
    { team_name: string; team_colour: string; points: number; wins: number }
  >();
  for (const d of drivers) {
    const cur = teamBag.get(d.team_name) ?? {
      team_name: d.team_name,
      team_colour: d.team_colour,
      points: 0,
      wins: 0,
    };
    cur.points += d.points;
    cur.wins += d.wins;
    teamBag.set(d.team_name, cur);
  }
  const teams: ConstructorStandingRow[] = [...teamBag.values()]
    .sort((a, b) => b.points - a.points || b.wins - a.wins)
    .map((t, i) => ({
      position: i + 1,
      team_name: t.team_name,
      team_colour: t.team_colour,
      points: Math.round(t.points * 10) / 10,
      wins: t.wins,
    }));

  return { drivers, teams, racesUsed };
}
