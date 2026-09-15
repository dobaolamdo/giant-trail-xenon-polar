import type {
  DriverListRow,
  LapHistoryRow,
  PitStopRow,
  RaceControlRow,
  SessionInfo,
  SessionSnapshot,
  SessionSnapshotCar,
} from "./types";

export const SESSION_KEY = 96001;
export const TOTAL_LAPS = 62;
const BASE_LAP = 97.84;

export type DriverDef = {
  driver_number: number;
  code: string;
  full_name: string;
  team_name: string;
  team_colour: string;
  grid: number;
  pace: number;
  consistency: number;
  pitLaps: number[];
  compounds: string[];
  dnfLap?: number;
};

const DRIVERS: DriverDef[] = [
  { driver_number: 1, code: "VER", full_name: "Max Verstappen", team_name: "Red Bull Racing", team_colour: "3671C6", grid: 1, pace: 0.9932, consistency: 0.11, pitLaps: [19], compounds: ["MEDIUM", "HARD"] },
  { driver_number: 4, code: "NOR", full_name: "Lando Norris", team_name: "McLaren", team_colour: "FF8000", grid: 2, pace: 0.9918, consistency: 0.13, pitLaps: [17], compounds: ["MEDIUM", "HARD"] },
  { driver_number: 81, code: "PIA", full_name: "Oscar Piastri", team_name: "McLaren", team_colour: "FF8000", grid: 3, pace: 0.9944, consistency: 0.14, pitLaps: [18], compounds: ["MEDIUM", "HARD"] },
  { driver_number: 16, code: "LEC", full_name: "Charles Leclerc", team_name: "Ferrari", team_colour: "E8002D", grid: 4, pace: 0.9956, consistency: 0.16, pitLaps: [20], compounds: ["MEDIUM", "HARD"] },
  { driver_number: 44, code: "HAM", full_name: "Lewis Hamilton", team_name: "Ferrari", team_colour: "E8002D", grid: 5, pace: 0.9968, consistency: 0.15, pitLaps: [21], compounds: ["MEDIUM", "HARD"] },
  { driver_number: 63, code: "RUS", full_name: "George Russell", team_name: "Mercedes", team_colour: "27F4D2", grid: 6, pace: 0.9961, consistency: 0.14, pitLaps: [18], compounds: ["MEDIUM", "HARD"] },
  { driver_number: 12, code: "ANT", full_name: "Kimi Antonelli", team_name: "Mercedes", team_colour: "27F4D2", grid: 7, pace: 0.9974, consistency: 0.2, pitLaps: [14, 38], compounds: ["SOFT", "HARD", "SOFT"] },
  { driver_number: 55, code: "SAI", full_name: "Carlos Sainz", team_name: "Williams", team_colour: "64C4FF", grid: 8, pace: 0.9988, consistency: 0.17, pitLaps: [22], compounds: ["MEDIUM", "HARD"] },
  { driver_number: 23, code: "ALB", full_name: "Alexander Albon", team_name: "Williams", team_colour: "64C4FF", grid: 9, pace: 0.9996, consistency: 0.18, pitLaps: [23], compounds: ["MEDIUM", "HARD"] },
  { driver_number: 14, code: "ALO", full_name: "Fernando Alonso", team_name: "Aston Martin", team_colour: "229971", grid: 10, pace: 1.0008, consistency: 0.16, pitLaps: [19], compounds: ["MEDIUM", "HARD"] },
  { driver_number: 22, code: "TSU", full_name: "Yuki Tsunoda", team_name: "Red Bull Racing", team_colour: "3671C6", grid: 11, pace: 1.0014, consistency: 0.19, pitLaps: [16, 41], compounds: ["SOFT", "HARD", "SOFT"] },
  { driver_number: 6, code: "HAD", full_name: "Isack Hadjar", team_name: "Racing Bulls", team_colour: "6692FF", grid: 12, pace: 1.0022, consistency: 0.22, pitLaps: [13, 36], compounds: ["SOFT", "MEDIUM", "SOFT"] },
  { driver_number: 30, code: "LAW", full_name: "Liam Lawson", team_name: "Racing Bulls", team_colour: "6692FF", grid: 13, pace: 1.003, consistency: 0.2, pitLaps: [21], compounds: ["MEDIUM", "HARD"] },
  { driver_number: 10, code: "GAS", full_name: "Pierre Gasly", team_name: "Alpine", team_colour: "0093C7", grid: 14, pace: 1.0036, consistency: 0.18, pitLaps: [16, 40], compounds: ["MEDIUM", "HARD", "SOFT"] },
  { driver_number: 43, code: "COL", full_name: "Franco Colapinto", team_name: "Alpine", team_colour: "0093C7", grid: 15, pace: 1.0048, consistency: 0.24, pitLaps: [15, 42], compounds: ["SOFT", "HARD", "MEDIUM"] },
  { driver_number: 31, code: "OCO", full_name: "Esteban Ocon", team_name: "Haas", team_colour: "B6BABD", grid: 16, pace: 1.0052, consistency: 0.19, pitLaps: [24], compounds: ["MEDIUM", "HARD"] },
  { driver_number: 87, code: "BEA", full_name: "Oliver Bearman", team_name: "Haas", team_colour: "B6BABD", grid: 17, pace: 1.006, consistency: 0.23, pitLaps: [14, 39], compounds: ["SOFT", "HARD", "SOFT"] },
  { driver_number: 27, code: "HUL", full_name: "Nico Hulkenberg", team_name: "Kick Sauber", team_colour: "52E252", grid: 18, pace: 1.0066, consistency: 0.17, pitLaps: [20], compounds: ["MEDIUM", "HARD"] },
  { driver_number: 5, code: "BOR", full_name: "Gabriel Bortoleto", team_name: "Kick Sauber", team_colour: "52E252", grid: 19, pace: 1.0078, consistency: 0.25, pitLaps: [15, 43], compounds: ["SOFT", "HARD", "MEDIUM"] },
  { driver_number: 18, code: "STR", full_name: "Lance Stroll", team_name: "Aston Martin", team_colour: "229971", grid: 20, pace: 1.0084, consistency: 0.21, pitLaps: [22], compounds: ["MEDIUM", "HARD"], dnfLap: 25 },
];

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function round3(n: number) {
  return Math.round(n * 1000) / 1000;
}

function degFor(compound: string) {
  switch (compound) {
    case "SOFT":
      return 0.00155;
    case "HARD":
      return 0.00072;
    default:
      return 0.00105;
  }
}

type CarState = DriverDef & {
  cumulative: number;
  tyreAge: number;
  stint: number;
  retired: boolean;
  laps: LapHistoryRow[];
};

export type RaceFeed = {
  session: SessionInfo;
  driverList: DriverListRow[];
  snapshots: SessionSnapshot[];
  duration: number;
  startMs: number;
  raceControl: RaceControlRow[];
  pitStops: PitStopRow[];
  lapsByDriver: Map<number, LapHistoryRow[]>;
  driverByNumber: Map<number, DriverDef>;
  totalLaps: number;
};

export function buildRace(opts: {
  seed: number;
  drivers: DriverDef[];
  meeting_name: string;
  circuit_short_name: string;
  country_name: string;
  date_start: string;
  winner_name?: string;
  totalLaps?: number;
}): RaceFeed {
  const drivers = opts.drivers;
  const totalLaps = opts.totalLaps ?? TOTAL_LAPS;
  const rng = mulberry32(opts.seed);
  const cars: CarState[] = drivers.map((d) => ({
    ...d,
    cumulative: 0,
    tyreAge: 0,
    stint: 0,
    retired: false,
    laps: [],
  }));

  const snapshots: SessionSnapshot[] = [];

  snapshots.push({
    completed_laps: 0,
    time: 0,
    cars: drivers.map((d) => ({
      driver_number: d.driver_number,
      cumulative: d.grid * 0.0001,
      last_lap: null,
      compound: d.compounds[0] ?? "MEDIUM",
      pit_this_lap: false,
      retired: false,
      sc_this_lap: false,
      sectors: null,
    })),
  });

  const scFrom = Math.min(26, Math.floor(totalLaps * 0.42));
  const scTo = scFrom + 3;

  for (let lap = 1; lap <= totalLaps; lap++) {
    const sc = lap >= scFrom && lap <= scTo;
    const running = cars.filter((c) => !c.retired);
    running.sort((a, b) => a.cumulative - b.cumulative);
    const leadCum = running[0]?.cumulative ?? 0;

    for (const car of cars) {
      if (car.retired) continue;
      if (car.dnfLap === lap) {
        car.retired = true;
        continue;
      }

      const compound = car.compounds[car.stint] ?? "HARD";
      const isPit = car.pitLaps.includes(lap);
      const pitOut = car.pitLaps.includes(lap - 1);
      let duration: number;

      if (sc) {
        const rank = Math.max(0, running.findIndex((c) => c.driver_number === car.driver_number));
        const target = leadCum + rank * 0.78;
        const remainingSc = scTo - lap + 1;
        const compress = (car.cumulative - target) / remainingSc;
        duration = 147.85 + rng() * 0.35 - compress;
        duration = Math.max(146.4, duration);
      } else {
        const fuel = 1 - lap * 0.00016;
        const deg = 1 + car.tyreAge * degFor(compound);
        const noise = 1 + (rng() * 2 - 1) * car.consistency * 0.0075;
        const startTax = lap === 1 ? 1.9 + car.grid * 0.12 : 0;
        duration = BASE_LAP * car.pace * fuel * deg * noise + startTax;
        if (isPit) duration += 22.8 + rng() * 2.4;
        if (pitOut) duration += 0.55;
      }

      duration = round3(duration);
      const s1f = 0.276 + (rng() - 0.5) * 0.008;
      const s2f = 0.351 + (rng() - 0.5) * 0.008;
      let s1 = round3(duration * s1f);
      let s2 = round3(duration * s2f);
      let s3 = round3(duration - s1 - s2);
      if (s3 < 8) {
        s3 = round3(duration * 0.37);
        s2 = round3(duration - s1 - s3);
      }

      car.laps.push({
        lap_number: lap,
        lap_duration: duration,
        duration_sector_1: s1,
        duration_sector_2: s2,
        duration_sector_3: s3,
        is_purple_s1: false,
        is_purple_s2: false,
        is_purple_s3: false,
        compound,
        is_pit_out_lap: pitOut,
      });
      car.cumulative = round3(car.cumulative + duration);
      if (isPit) {
        car.stint += 1;
        car.tyreAge = 0;
      } else {
        car.tyreAge += 1;
      }
    }

    const lead = cars
      .filter((c) => !c.retired)
      .reduce((min, c) => (c.cumulative < min ? c.cumulative : min), Infinity);

    snapshots.push({
      completed_laps: lap,
      time: round3(lead),
      cars: cars.map((c) => {
        const last = c.laps[c.laps.length - 1];
        const retiredAlready = c.retired;
        return {
          driver_number: c.driver_number,
          cumulative: c.cumulative,
          last_lap: last && last.lap_number === lap ? last.lap_duration : (last?.lap_duration ?? null),
          compound: last?.compound ?? c.compounds[0] ?? "MEDIUM",
          pit_this_lap: Boolean(last && last.lap_number === lap && c.pitLaps.includes(lap)),
          retired: retiredAlready,
          sc_this_lap: sc && !retiredAlready,
          sectors: last && last.lap_number === lap
            ? [last.duration_sector_1, last.duration_sector_2, last.duration_sector_3]
            : null,
        } satisfies SessionSnapshotCar;
      }),
    });
  }

  const dateStart = opts.date_start;
  const startMs = Date.parse(dateStart);
  const duration = snapshots[snapshots.length - 1]?.time ?? 0;
  const dateEnd = new Date(startMs + Math.ceil(duration) * 1000).toISOString();

  const atLapTime = (lap: number, extra = 0) => {
    const snap = snapshots[Math.min(lap, snapshots.length - 1)];
    return new Date(startMs + Math.round(((snap?.time ?? 0) + extra) * 1000)).toISOString();
  };

  const win = (opts.winner_name ?? "THE LEADER").toUpperCase();
  const raceControl: RaceControlRow[] = [
    { date: new Date(startMs).toISOString(), category: "Flag", flag: "GREEN", scope: "Track", driver_number: null, message: "GREEN FLAG — RACE START" },
    { date: atLapTime(scFrom, 4), category: "Flag", flag: "YELLOW", scope: "Sector", driver_number: null, message: "YELLOW FLAG — INCIDENT" },
    { date: atLapTime(scFrom, 9), category: "SafetyCar", flag: "SAFETY CAR", scope: "Track", driver_number: null, message: "SAFETY CAR DEPLOYED" },
    { date: atLapTime(scTo, 40), category: "SafetyCar", flag: "SAFETY CAR", scope: "Track", driver_number: null, message: "SAFETY CAR IN THIS LAP" },
    { date: atLapTime(scTo + 1, 2), category: "Flag", flag: "GREEN", scope: "Track", driver_number: null, message: "TRACK CLEAR — GREEN FLAG" },
    { date: atLapTime(totalLaps, 1), category: "Flag", flag: "CHEQUERED", scope: "Track", driver_number: null, message: `CHEQUERED FLAG — ${win} WINS` },
  ];

  const pitStops: PitStopRow[] = [];
  for (const car of cars) {
    for (const pitLap of car.pitLaps) {
      if (car.dnfLap && pitLap >= car.dnfLap) continue;
      if (pitLap > totalLaps) continue;
      const stop = round3(2.15 + mulberry32(car.driver_number * 97 + pitLap)() * 1.7);
      const lane = round3(22.4 + mulberry32(car.driver_number * 13 + pitLap)() * 3.8);
      pitStops.push({
        driver_number: car.driver_number,
        full_name: car.full_name,
        lap_number: pitLap,
        stop_duration: stop,
        lane_duration: lane,
      });
    }
  }
  pitStops.sort((a, b) => a.lap_number - b.lap_number || a.stop_duration - b.stop_duration);

  const session: SessionInfo = {
    meeting_name: opts.meeting_name,
    session_name: "Race",
    circuit_short_name: opts.circuit_short_name,
    country_name: opts.country_name,
    date_start: dateStart,
    date_end: dateEnd,
  };

  const driverList: DriverListRow[] = drivers.map((d) => ({
    driver_number: d.driver_number,
    full_name: d.full_name,
    team_name: d.team_name,
    team_colour: d.team_colour,
    headshot_url: "",
    code: d.code,
  }));

  const lapsByDriver = new Map<number, LapHistoryRow[]>();
  for (const car of cars) lapsByDriver.set(car.driver_number, car.laps);

  const driverByNumber = new Map(drivers.map((d) => [d.driver_number, d]));

  return {
    session,
    driverList,
    snapshots,
    duration,
    startMs,
    raceControl,
    pitStops,
    lapsByDriver,
    driverByNumber,
    totalLaps,
  };
}

export const RACE = buildRace({
  seed: 20261004,
  drivers: DRIVERS,
  meeting_name: "Singapore Grand Prix",
  circuit_short_name: "Marina Bay",
  country_name: "Singapore",
  date_start: "2026-10-04T12:00:00.000Z",
  winner_name: "Norris",
});

export function raceIso(elapsed: number, startMs = RACE.startMs) {
  return new Date(startMs + Math.max(0, elapsed) * 1000).toISOString();
}

export { DRIVERS };
