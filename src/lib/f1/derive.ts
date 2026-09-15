import type { LeaderboardRow } from "./types";
import { raceIso, type RaceFeed } from "./simulate";
import { getFeed } from "./feed";

export type SectorKind = "S1" | "S2" | "S3" | "LAP";

export type DerivedEvent = {
  id: string;
  t: number;
  lap_number: number;
  driver_number: number;
  code: string;
  full_name: string;
  team_colour: string;
  kind: SectorKind;
  value: number;
  beaten: number | null;
  beaten_code: string | null;
};

export type SessionBest = {
  kind: SectorKind;
  value: number;
  driver_number: number;
  code: string;
  lap_number: number;
  t: number;
};

export type TraceFrame = {
  raw: {
    driver_number: number;
    code: string;
    lap_number: number;
    duration_sector_1: number;
    duration_sector_2: number;
    duration_sector_3: number;
    lap_duration: number;
    timestamp: string;
  } | null;
  trigger: {
    sql: string;
    fired: boolean;
    kind: SectorKind | null;
    old_best: number | null;
    new_best: number | null;
  };
  derived: {
    live_rank: number | null;
    gap_to_leader: number | null;
    gap_to_car_ahead: number | null;
    purple: SectorKind[];
    formula_rank: string;
    formula_gap: string;
  };
};

function sectorValue(kind: SectorKind, lap: {
  duration_sector_1: number;
  duration_sector_2: number;
  duration_sector_3: number;
  lap_duration: number;
}) {
  if (kind === "S1") return lap.duration_sector_1;
  if (kind === "S2") return lap.duration_sector_2;
  if (kind === "S3") return lap.duration_sector_3;
  return lap.lap_duration;
}

function buildDerivedEvents(feed: RaceFeed): DerivedEvent[] {
  const items: {
    t: number;
    lap_number: number;
    driver_number: number;
    code: string;
    full_name: string;
    team_colour: string;
    pit: boolean;
    duration_sector_1: number;
    duration_sector_2: number;
    duration_sector_3: number;
    lap_duration: number;
  }[] = [];

  for (const [num, laps] of feed.lapsByDriver) {
    const def = feed.driverByNumber.get(num);
    if (!def) continue;
    let t = 0;
    for (const lap of laps) {
      t += lap.lap_duration;
      items.push({
        t,
        lap_number: lap.lap_number,
        driver_number: num,
        code: def.code,
        full_name: def.full_name,
        team_colour: def.team_colour,
        pit: lap.is_pit_out_lap,
        duration_sector_1: lap.duration_sector_1,
        duration_sector_2: lap.duration_sector_2,
        duration_sector_3: lap.duration_sector_3,
        lap_duration: lap.lap_duration,
      });
    }
  }
  items.sort((a, b) => a.t - b.t || a.driver_number - b.driver_number);

  const best: Record<SectorKind, { value: number; code: string } | null> = {
    S1: null,
    S2: null,
    S3: null,
    LAP: null,
  };
  const kinds: SectorKind[] = ["S1", "S2", "S3", "LAP"];
  const events: DerivedEvent[] = [];

  for (const row of items) {
    if (row.pit) continue;
    for (const kind of kinds) {
      const value = sectorValue(kind, row);
      const cur = best[kind];
      if (!cur || value < cur.value - 0.0004) {
        events.push({
          id: `${row.t}-${row.driver_number}-${kind}`,
          t: row.t,
          lap_number: row.lap_number,
          driver_number: row.driver_number,
          code: row.code,
          full_name: row.full_name,
          team_colour: row.team_colour,
          kind,
          value,
          beaten: cur?.value ?? null,
          beaten_code: cur?.code ?? null,
        });
        best[kind] = { value, code: row.code };
      }
    }
  }
  return events;
}

const eventCache = new Map<number, DerivedEvent[]>();

function eventsFor(session_key: number): DerivedEvent[] {
  const hit = eventCache.get(session_key);
  if (hit) return hit;
  const feed = getFeed(session_key);
  if (!feed) return [];
  const events = buildDerivedEvents(feed);
  eventCache.set(session_key, events);
  return events;
}

/** Trigger stream: each time a sector/lap beats the session min. */
export function Get_Derived_Events(session_key: number, elapsed = 0): DerivedEvent[] {
  return eventsFor(session_key).filter((e) => e.t <= elapsed);
}

export function Get_Session_Bests(
  session_key: number,
  elapsed = 0,
): Record<SectorKind, SessionBest | null> {
  const out: Record<SectorKind, SessionBest | null> = {
    S1: null,
    S2: null,
    S3: null,
    LAP: null,
  };
  for (const e of eventsFor(session_key)) {
    if (e.t > elapsed) break;
    out[e.kind] = {
      kind: e.kind,
      value: e.value,
      driver_number: e.driver_number,
      code: e.code,
      lap_number: e.lap_number,
      t: e.t,
    };
  }
  return out;
}

export function Get_Trace_Frame(
  session_key: number,
  elapsed = 0,
  board: LeaderboardRow[] = [],
): TraceFrame {
  const feed = getFeed(session_key);
  const events = Get_Derived_Events(session_key, elapsed);
  const latest = events[events.length - 1] ?? null;
  const rows = board;
  const focusNo = latest?.driver_number ?? rows[0]?.driver_number;
  const row = rows.find((r) => r.driver_number === focusNo);
  const laps = feed && focusNo != null ? (feed.lapsByDriver.get(focusNo) ?? []) : [];
  const n = feed
    ? (() => {
        const snaps = feed.snapshots;
        let i = 0;
        while (i < snaps.length - 1 && snaps[i + 1]!.time <= elapsed) i += 1;
        return snaps[i]!.completed_laps;
      })()
    : 0;
  const lap = laps.find((l) => l.lap_number === (latest?.lap_number ?? n));

  const purple: SectorKind[] = [];
  if (lap && latest) {
    if (latest.kind) purple.push(latest.kind);
  }

  return {
    raw: lap && focusNo != null && latest
      ? {
          driver_number: focusNo,
          code: latest.code,
          lap_number: lap.lap_number,
          duration_sector_1: lap.duration_sector_1,
          duration_sector_2: lap.duration_sector_2,
          duration_sector_3: lap.duration_sector_3,
          lap_duration: lap.lap_duration,
          timestamp: raceIso(latest.t, feed?.startMs),
        }
      : null,
    trigger: {
      sql:
        latest == null
          ? "AFTER INSERT ON laps\nFOR EACH ROW\nIF NEW.sector < (SELECT MIN(sector) FROM laps)\nTHEN is_purple = 1"
          : `AFTER INSERT ON laps FOR EACH ROW
IF NEW.duration_${latest.kind === "LAP" ? "lap" : latest.kind.toLowerCase()}
   < (SELECT MIN(duration_${latest.kind === "LAP" ? "lap" : latest.kind.toLowerCase()})
      FROM laps WHERE session_key = NEW.session_key)
THEN SET NEW.is_purple_${latest.kind.toLowerCase()} = 1;`,
      fired: Boolean(latest),
      kind: latest?.kind ?? null,
      old_best: latest?.beaten ?? null,
      new_best: latest?.value ?? null,
    },
    derived: {
      live_rank: row?.live_rank ?? null,
      gap_to_leader: row?.gap_to_leader ?? null,
      gap_to_car_ahead: row?.gap_to_car_ahead ?? null,
      purple,
      formula_rank: "RANK() OVER (ORDER BY cumulative_time)",
      formula_gap: "this.cumulative - leader.cumulative",
    },
  };
}
