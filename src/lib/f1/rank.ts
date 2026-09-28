/** Shared ranking helpers — DNF / fewer laps never float to P1. */

export type RankableLap = {
  driver_number: number;
  lap_number: number;
  lap_duration: number | string | null;
};

export type RankDriverMeta = {
  full_name?: string;
  team_name?: string;
  team_colour?: string;
  code?: string;
};

export type RankedRow = {
  live_rank: number;
  driver_number: number;
  full_name: string;
  team_name: string;
  team_colour: string;
  gap_to_leader: number | null;
  gap_to_car_ahead: number | null;
  last_lap: number | null;
  status: "DNF" | "PIT" | "SC" | null;
  position_change: number;
  code?: string;
  points?: number;
  laps_completed: number;
};

export type SessionResultRow = {
  position: number | null;
  driver_number: number;
  number_of_laps?: number | null;
  points?: number | null;
  dnf?: boolean;
  dns?: boolean;
  dsq?: boolean;
  duration?: number | null;
  gap_to_leader?: number | string | null;
};

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Build leaderboard from raw laps up to maxLap (inclusive). */
export function rankFromLaps(
  laps: RankableLap[],
  meta: Map<number, RankDriverMeta>,
  opts?: { maxLap?: number; dnfDrivers?: Set<number> },
): RankedRow[] {
  const maxLap = opts?.maxLap ?? Infinity;
  const dnfDrivers = opts?.dnfDrivers ?? new Set<number>();

  type Acc = {
    laps: number;
    total: number;
    last: number | null;
  };
  const by = new Map<number, Acc>();

  for (const l of laps) {
    if (l.lap_number > maxLap) continue;
    const dur = num(l.lap_duration);
    if (dur == null || dur <= 0) continue;
    const cur = by.get(l.driver_number) ?? { laps: 0, total: 0, last: null };
    cur.laps += 1;
    cur.total += dur;
    cur.last = dur;
    by.set(l.driver_number, cur);
  }

  // Include DNF drivers who may have zero timed laps in the window
  for (const num of dnfDrivers) {
    if (!by.has(num)) by.set(num, { laps: 0, total: 0, last: null });
  }

  const entries = [...by.entries()].map(([driver_number, acc]) => ({
    driver_number,
    laps: acc.laps,
    total: acc.total,
    last: acc.last,
    dnf: dnfDrivers.has(driver_number),
  }));

  // 1) classified (not DNF) by more laps first, then less time
  // 2) DNF last, by more laps first, then less time
  entries.sort((a, b) => {
    if (a.dnf !== b.dnf) return a.dnf ? 1 : -1;
    if (a.laps !== b.laps) return b.laps - a.laps;
    return a.total - b.total;
  });

  const leader = entries.find((e) => !e.dnf && e.laps > 0);
  const leaderT = leader?.total ?? 0;
  const leaderLaps = leader?.laps ?? 0;

  return entries.map((e, i) => {
    const m = meta.get(e.driver_number);
    let gap: number | null = null;
    if (!e.dnf && leader && e.driver_number !== leader.driver_number) {
      if (e.laps < leaderLaps) {
        // Lapped — show null gap (UI can show +1 lap later)
        gap = null;
      } else {
        gap = Math.max(0, e.total - leaderT);
      }
    }
    return {
      live_rank: i + 1,
      driver_number: e.driver_number,
      full_name: m?.full_name ?? `#${e.driver_number}`,
      team_name: m?.team_name ?? "",
      team_colour: (m?.team_colour ?? "888888").replace(/^#/, ""),
      gap_to_leader: e.dnf ? null : gap,
      gap_to_car_ahead: null,
      last_lap: e.last,
      status: e.dnf ? ("DNF" as const) : null,
      position_change: 0,
      code: m?.code,
      laps_completed: e.laps,
    };
  });
}

/** Prefer official OpenF1 session_result when race is finished. */
export function rankFromSessionResult(
  results: SessionResultRow[],
  meta: Map<number, RankDriverMeta>,
): RankedRow[] {
  const sorted = [...results].sort((a, b) => {
    const pa = a.position == null || a.dnf || a.dns || a.dsq ? 999 : a.position;
    const pb = b.position == null || b.dnf || b.dns || b.dsq ? 999 : b.position;
    if (pa !== pb) return pa - pb;
    const la = a.number_of_laps ?? 0;
    const lb = b.number_of_laps ?? 0;
    if (la !== lb) return lb - la;
    return (num(a.duration) ?? 1e12) - (num(b.duration) ?? 1e12);
  });

  const leader = sorted.find((r) => r.position === 1 && !r.dnf);
  const leaderDur = num(leader?.duration) ?? 0;

  return sorted.map((r, i) => {
    const m = meta.get(r.driver_number);
    const isDnf = Boolean(r.dnf || r.dns || r.dsq || r.position == null);
    let gap: number | null = null;
    if (!isDnf && r.position !== 1) {
      const g = num(r.gap_to_leader);
      if (g != null) gap = g;
      else {
        const d = num(r.duration);
        if (d != null && leaderDur > 0) gap = Math.max(0, d - leaderDur);
      }
    }
    return {
      live_rank: isDnf ? i + 1 : (r.position ?? i + 1),
      driver_number: r.driver_number,
      full_name: m?.full_name ?? `#${r.driver_number}`,
      team_name: m?.team_name ?? "",
      team_colour: (m?.team_colour ?? "888888").replace(/^#/, ""),
      gap_to_leader: isDnf ? null : gap,
      gap_to_car_ahead: null,
      last_lap: null,
      status: isDnf ? ("DNF" as const) : null,
      position_change: 0,
      code: m?.code,
      points: r.points != null ? Number(r.points) : undefined,
      laps_completed: r.number_of_laps ?? 0,
    };
  });
}
