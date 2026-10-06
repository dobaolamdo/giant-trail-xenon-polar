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

/** Per-driver sorted lap durations (seconds). */
function driverLapSeq(
  laps: RankableLap[],
): Map<number, { lap: number; dur: number }[]> {
  const by = new Map<number, { lap: number; dur: number }[]>();
  for (const l of laps) {
    const dur = num(l.lap_duration);
    if (dur == null || dur <= 0) continue;
    const arr = by.get(l.driver_number) ?? [];
    arr.push({ lap: l.lap_number, dur });
    by.set(l.driver_number, arr);
  }
  for (const arr of by.values()) {
    arr.sort((a, b) => a.lap - b.lap);
  }
  return by;
}

/** Full race duration (seconds) = max cumulative time across drivers. */
export function raceDurationSec(laps: RankableLap[]): number {
  const by = driverLapSeq(laps);
  let max = 0;
  for (const arr of by.values()) {
    const t = arr.reduce((s, x) => s + x.dur, 0);
    if (t > max) max = t;
  }
  return max;
}

/** Max lap number present in data. */
export function raceMaxLap(laps: RankableLap[]): number {
  let m = 0;
  for (const l of laps) if (l.lap_number > m) m = l.lap_number;
  return m;
}

/**
 * Rank at race clock `elapsedSec` (seconds from race start).
 * A driver has completed lap n when cumulative time through lap n <= elapsed.
 */
export function rankFromElapsed(
  laps: RankableLap[],
  meta: Map<number, RankDriverMeta>,
  elapsedSec: number,
  opts?: { dnfDrivers?: Set<number> },
): RankedRow[] {
  const dnfDrivers = opts?.dnfDrivers ?? new Set<number>();
  const by = driverLapSeq(laps);
  const t = Math.max(0, elapsedSec);

  type Acc = {
    driver_number: number;
    laps: number;
    total: number;
    last: number | null;
    dnf: boolean;
  };
  const entries: Acc[] = [];

  const allDrivers = new Set<number>([
    ...by.keys(),
    ...dnfDrivers,
  ]);

  for (const driver_number of allDrivers) {
    const seq = by.get(driver_number) ?? [];
    let cum = 0;
    let completed = 0;
    let last: number | null = null;
    for (const row of seq) {
      if (cum + row.dur <= t + 1e-9) {
        cum += row.dur;
        completed += 1;
        last = row.dur;
      } else {
        break;
      }
    }
    entries.push({
      driver_number,
      laps: completed,
      total: cum,
      last,
      dnf: dnfDrivers.has(driver_number),
    });
  }

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
      if (e.laps < leaderLaps) gap = null;
      else gap = Math.max(0, e.total - leaderT);
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

/** Leader's completed lap count at elapsedSec (for sector/purple UI). */
export function leaderLapAt(
  laps: RankableLap[],
  elapsedSec: number,
): number {
  const ranked = rankFromElapsed(laps, new Map(), elapsedSec);
  return ranked[0]?.laps_completed ?? 0;
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

  for (const n of dnfDrivers) {
    if (!by.has(n)) by.set(n, { laps: 0, total: 0, last: null });
  }

  const entries = [...by.entries()].map(([driver_number, acc]) => ({
    driver_number,
    laps: acc.laps,
    total: acc.total,
    last: acc.last,
    dnf: dnfDrivers.has(driver_number),
  }));

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
      if (e.laps < leaderLaps) gap = null;
      else gap = Math.max(0, e.total - leaderT);
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
