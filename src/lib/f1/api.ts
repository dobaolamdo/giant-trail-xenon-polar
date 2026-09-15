import type {
  DriverListRow,
  LapHistoryRow,
  LeaderboardRow,
  PitStopRow,
  RaceControlRow,
  SessionInfo,
  SessionSnapshotCar,
  WeatherRow,
} from "./types";
import { RACE, SESSION_KEY, TOTAL_LAPS, raceIso, type RaceFeed } from "./simulate";
import { getFeed } from "./feed";
import {
  Get_Meeting,
  Get_Race_Result,
  Get_Season_Drivers,
} from "./archive";

export {
  Get_Constructor_Standings,
  Get_Driver_Standings,
  Get_Meeting,
  Get_Race_Result,
  Get_Season_Drivers,
  Get_Season_Meetings,
  Get_Seasons,
  hasTimingFeed,
  isLiveSession,
} from "./archive";

export { getFeed } from "./feed";

function lerp(a: number, b: number, f: number) {
  return a + (b - a) * f;
}

function snapshotWindow(feed: RaceFeed, elapsed: number) {
  const snaps = feed.snapshots;
  const t = Math.max(0, elapsed);
  if (t <= 0) return { a: snaps[0]!, b: snaps[0]!, f: 0 };
  let i = 0;
  while (i < snaps.length - 1 && snaps[i + 1]!.time <= t) i += 1;
  const a = snaps[i]!;
  const b = snaps[Math.min(i + 1, snaps.length - 1)]!;
  if (a === b || b.time <= a.time) return { a, b: a, f: 0 };
  const f = Math.min(1, Math.max(0, (t - a.time) / (b.time - a.time)));
  return { a, b, f };
}

function boardFromCars(
  feed: RaceFeed,
  cars: SessionSnapshotCar[],
  prevRank?: Map<number, number>,
): LeaderboardRow[] {
  const ordered = [...cars].sort((x, y) => {
    if (x.retired !== y.retired) return x.retired ? 1 : -1;
    return x.cumulative - y.cumulative;
  });
  const leader = ordered.find((c) => !c.retired);
  return ordered.map((car, idx) => {
    const def = feed.driverByNumber.get(car.driver_number);
    const ahead = idx === 0 ? null : ordered[idx - 1]!;
    let status: LeaderboardRow["status"] = null;
    if (car.retired) status = "DNF";
    else if (car.pit_this_lap) status = "PIT";
    else if (car.sc_this_lap) status = "SC";
    const prev = prevRank?.get(car.driver_number);
    return {
      live_rank: idx + 1,
      driver_number: car.driver_number,
      full_name: def?.full_name ?? `#${car.driver_number}`,
      team_name: def?.team_name ?? "",
      team_colour: def?.team_colour ?? "888888",
      gap_to_leader:
        car.retired || !leader || car === leader
          ? null
          : Math.max(0, car.cumulative - leader.cumulative),
      gap_to_car_ahead:
        car.retired || !ahead || idx === 0
          ? null
          : Math.max(0, car.cumulative - ahead.cumulative),
      compound: car.compound,
      last_lap: car.last_lap,
      status,
      position_change: prev == null ? 0 : prev - (idx + 1),
      code: def?.code,
    };
  });
}

function resultBoard(session_key: number): LeaderboardRow[] {
  return Get_Race_Result(session_key).map((r, i, all) => ({
    live_rank: r.position,
    driver_number: r.driver_number,
    full_name: r.full_name,
    team_name: r.team_name,
    team_colour: r.team_colour,
    gap_to_leader: r.gap_to_leader,
    gap_to_car_ahead:
      i === 0 || r.status === "DNF" || all[i - 1]?.status === "DNF"
        ? null
        : Math.max(0, (r.gap_to_leader ?? 0) - (all[i - 1]?.gap_to_leader ?? 0)),
    status: r.status === "DNF" ? "DNF" : null,
    code: r.code,
    points: r.points,
    last_lap: null,
  }));
}

/** 1. Get_Live_Leaderboard(session_key) */
export function Get_Live_Leaderboard(session_key: number, elapsed = 0): LeaderboardRow[] {
  const feed = getFeed(session_key);
  if (!feed) return resultBoard(session_key);
  const { a, b, f } = snapshotWindow(feed, elapsed);
  const byA = new Map(a.cars.map((c) => [c.driver_number, c]));
  const mixed: SessionSnapshotCar[] = b.cars.map((carB) => {
    const carA = byA.get(carB.driver_number) ?? carB;
    const pit =
      f > 0.18 && f < 0.82
        ? carB.pit_this_lap
        : Boolean(carA.pit_this_lap && f < 0.5);
    return {
      ...carB,
      cumulative: lerp(carA.cumulative, carB.cumulative, f),
      pit_this_lap: pit,
      sc_this_lap: carA.sc_this_lap || carB.sc_this_lap,
      retired: carA.retired || carB.retired,
      last_lap: f < 0.08 ? carA.last_lap : carB.last_lap,
      compound: f < 0.5 ? carA.compound : carB.compound,
    };
  });
  const prev = new Map(
    a.cars
      .slice()
      .sort((x, y) => Number(x.retired) - Number(y.retired) || x.cumulative - y.cumulative)
      .map((c, i) => [c.driver_number, i + 1] as const),
  );
  const rows = boardFromCars(feed, mixed, prev);
  if (a.completed_laps === 0 && f < 0.02) {
    return rows.map((r) => ({
      ...r,
      gap_to_leader: r.live_rank === 1 ? null : null,
      gap_to_car_ahead: null,
      last_lap: null,
      position_change: 0,
    }));
  }
  return rows;
}

function sessionBests(feed: RaceFeed, upToLap: number) {
  let minS1 = Infinity;
  let minS2 = Infinity;
  let minS3 = Infinity;
  let minLap = Infinity;
  for (const laps of feed.lapsByDriver.values()) {
    for (const l of laps) {
      if (l.lap_number > upToLap || l.is_pit_out_lap) continue;
      minS1 = Math.min(minS1, l.duration_sector_1);
      minS2 = Math.min(minS2, l.duration_sector_2);
      minS3 = Math.min(minS3, l.duration_sector_3);
      minLap = Math.min(minLap, l.lap_duration);
    }
  }
  return { minS1, minS2, minS3, minLap };
}

function completedLapsForDriver(feed: RaceFeed, driver_number: number, elapsed: number): number {
  const { a } = snapshotWindow(feed, elapsed);
  const car = a.cars.find((c) => c.driver_number === driver_number);
  if (car?.retired) {
    return feed.lapsByDriver.get(driver_number)?.length ?? 0;
  }
  return a.completed_laps;
}

/** 2. Get_Driver_Lap_History(session_key, driver_number) */
export function Get_Driver_Lap_History(
  session_key: number,
  driver_number: number,
  elapsed = 0,
): LapHistoryRow[] {
  const feed = getFeed(session_key);
  if (!feed) return [];
  const all = feed.lapsByDriver.get(driver_number) ?? [];
  const n = completedLapsForDriver(feed, driver_number, elapsed);
  const visible = all.filter((l) => l.lap_number <= n);
  const bests = sessionBests(feed, n);
  const eps = 0.0005;
  let pb = Infinity;
  for (const l of visible) {
    if (!l.is_pit_out_lap) pb = Math.min(pb, l.lap_duration);
  }
  return visible.map((l) => ({
    ...l,
    is_purple_s1: !l.is_pit_out_lap && l.duration_sector_1 <= bests.minS1 + eps,
    is_purple_s2: !l.is_pit_out_lap && l.duration_sector_2 <= bests.minS2 + eps,
    is_purple_s3: !l.is_pit_out_lap && l.duration_sector_3 <= bests.minS3 + eps,
    is_personal_best: !l.is_pit_out_lap && l.lap_duration <= pb + eps,
  }));
}

/** 3. Get_Session_Weather(session_key) */
export function Get_Session_Weather(session_key: number, elapsed = 0): WeatherRow {
  const feed = getFeed(session_key) ?? RACE;
  const t = Math.max(0, Math.min(1, elapsed / Math.max(1, feed.duration)));
  const wave = Math.sin(elapsed / 80);
  return {
    air_temperature: Math.round((29.6 - t * 1.3 + wave * 0.15) * 10) / 10,
    track_temperature: Math.round((34.2 - t * 2.1 + wave * 0.25) * 10) / 10,
    humidity: Math.round((77.4 + t * 2.1 + wave * 1.2) * 10) / 10,
    rainfall: false,
    wind_speed: Math.round((7.4 + wave * 1.6) * 10) / 10,
    date: raceIso(elapsed, feed.startMs),
  };
}

/** 4. Get_Race_Control_Feed(session_key, since_date) */
export function Get_Race_Control_Feed(
  session_key: number,
  since_date: string,
  elapsed = 0,
): RaceControlRow[] {
  const feed = getFeed(session_key);
  if (!feed) return [];
  const now = raceIso(elapsed, feed.startMs);
  return feed.raceControl.filter((m) => m.date > since_date && m.date <= now);
}

export function Get_Race_Control_Until(session_key: number, elapsed = 0): RaceControlRow[] {
  const feed = getFeed(session_key);
  if (!feed) return [];
  const now = raceIso(elapsed, feed.startMs);
  return feed.raceControl.filter((m) => m.date <= now);
}

/** 5. Get_Pit_Stops(session_key) */
export function Get_Pit_Stops(session_key: number, elapsed = 0): PitStopRow[] {
  const feed = getFeed(session_key);
  if (!feed) return [];
  const { a } = snapshotWindow(feed, elapsed);
  return feed.pitStops.filter((p) => p.lap_number <= a.completed_laps + 1);
}

/** 6. Get_Session_Info(session_key) */
export function Get_Session_Info(session_key: number): SessionInfo | null {
  const feed = getFeed(session_key);
  if (feed) return feed.session;
  const m = Get_Meeting(session_key);
  if (!m) return null;
  return {
    meeting_name: m.meeting_name,
    session_name: "Race",
    circuit_short_name: m.circuit_short_name,
    country_name: m.country_name,
    date_start: m.date_start,
    date_end: m.date_start,
  };
}

/** 7. Get_Driver_List(session_key) */
export function Get_Driver_List(session_key: number): DriverListRow[] {
  const feed = getFeed(session_key);
  if (feed) return feed.driverList;
  const m = Get_Meeting(session_key);
  if (!m) return [];
  return Get_Season_Drivers(m.year);
}

export function currentLapNumber(session_key: number, elapsed: number): number {
  const feed = getFeed(session_key);
  if (!feed) return 0;
  const { a } = snapshotWindow(feed, elapsed);
  if (a.completed_laps >= feed.totalLaps) return feed.totalLaps;
  return Math.min(feed.totalLaps, Math.max(1, a.completed_laps + 1));
}

export function isRaceFinished(session_key: number, elapsed: number) {
  const feed = getFeed(session_key);
  if (!feed) return false;
  return elapsed >= feed.duration - 0.05;
}

export function sessionProgress(session_key: number, elapsed: number) {
  const feed = getFeed(session_key);
  if (!feed) return 0;
  return Math.min(1, Math.max(0, elapsed / Math.max(1, feed.duration)));
}

export { SESSION_KEY, TOTAL_LAPS, RACE };
