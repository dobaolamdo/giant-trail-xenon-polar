import type {
  ConstructorStandingRow,
  DriverListRow,
  DriverStandingRow,
  MeetingRow,
  RaceResultRow,
  SeasonRow,
} from "./types";
import { SESSION_KEY } from "./simulate";

export type ArchiveDriver = {
  driver_number: number;
  code: string;
  full_name: string;
  team_name: string;
  team_colour: string;
  pace: number;
};

const TRACKS: {
  round: number;
  meeting_name: string;
  circuit_short_name: string;
  country_name: string;
  month: number;
  day: number;
}[] = [
  { round: 1, meeting_name: "Australian Grand Prix", circuit_short_name: "Melbourne", country_name: "Australia", month: 3, day: 16 },
  { round: 2, meeting_name: "Chinese Grand Prix", circuit_short_name: "Shanghai", country_name: "China", month: 3, day: 23 },
  { round: 3, meeting_name: "Japanese Grand Prix", circuit_short_name: "Suzuka", country_name: "Japan", month: 4, day: 6 },
  { round: 4, meeting_name: "Bahrain Grand Prix", circuit_short_name: "Sakhir", country_name: "Bahrain", month: 4, day: 13 },
  { round: 5, meeting_name: "Saudi Arabian Grand Prix", circuit_short_name: "Jeddah", country_name: "Saudi Arabia", month: 4, day: 20 },
  { round: 6, meeting_name: "Miami Grand Prix", circuit_short_name: "Miami", country_name: "United States", month: 5, day: 4 },
  { round: 7, meeting_name: "Emilia Romagna Grand Prix", circuit_short_name: "Imola", country_name: "Italy", month: 5, day: 18 },
  { round: 8, meeting_name: "Monaco Grand Prix", circuit_short_name: "Monaco", country_name: "Monaco", month: 5, day: 25 },
  { round: 9, meeting_name: "Spanish Grand Prix", circuit_short_name: "Barcelona", country_name: "Spain", month: 6, day: 1 },
  { round: 10, meeting_name: "Canadian Grand Prix", circuit_short_name: "Montreal", country_name: "Canada", month: 6, day: 15 },
  { round: 11, meeting_name: "Austrian Grand Prix", circuit_short_name: "Spielberg", country_name: "Austria", month: 6, day: 29 },
  { round: 12, meeting_name: "British Grand Prix", circuit_short_name: "Silverstone", country_name: "United Kingdom", month: 7, day: 6 },
  { round: 13, meeting_name: "Belgian Grand Prix", circuit_short_name: "Spa-Francorchamps", country_name: "Belgium", month: 7, day: 27 },
  { round: 14, meeting_name: "Hungarian Grand Prix", circuit_short_name: "Hungaroring", country_name: "Hungary", month: 8, day: 3 },
  { round: 15, meeting_name: "Dutch Grand Prix", circuit_short_name: "Zandvoort", country_name: "Netherlands", month: 8, day: 31 },
  { round: 16, meeting_name: "Italian Grand Prix", circuit_short_name: "Monza", country_name: "Italy", month: 9, day: 7 },
  { round: 17, meeting_name: "Azerbaijan Grand Prix", circuit_short_name: "Baku", country_name: "Azerbaijan", month: 9, day: 21 },
  { round: 18, meeting_name: "Singapore Grand Prix", circuit_short_name: "Marina Bay", country_name: "Singapore", month: 10, day: 4 },
  { round: 19, meeting_name: "United States Grand Prix", circuit_short_name: "Austin", country_name: "United States", month: 10, day: 19 },
  { round: 20, meeting_name: "Mexico City Grand Prix", circuit_short_name: "Mexico City", country_name: "Mexico", month: 10, day: 26 },
  { round: 21, meeting_name: "São Paulo Grand Prix", circuit_short_name: "Interlagos", country_name: "Brazil", month: 11, day: 9 },
  { round: 22, meeting_name: "Las Vegas Grand Prix", circuit_short_name: "Las Vegas", country_name: "United States", month: 11, day: 22 },
  { round: 23, meeting_name: "Qatar Grand Prix", circuit_short_name: "Lusail", country_name: "Qatar", month: 11, day: 30 },
  { round: 24, meeting_name: "Abu Dhabi Grand Prix", circuit_short_name: "Yas Marina", country_name: "United Arab Emirates", month: 12, day: 7 },
];

const TRACKS_2023: typeof TRACKS = [
  { round: 1, meeting_name: "Bahrain Grand Prix", circuit_short_name: "Sakhir", country_name: "Bahrain", month: 3, day: 5 },
  { round: 2, meeting_name: "Saudi Arabian Grand Prix", circuit_short_name: "Jeddah", country_name: "Saudi Arabia", month: 3, day: 19 },
  { round: 3, meeting_name: "Australian Grand Prix", circuit_short_name: "Melbourne", country_name: "Australia", month: 4, day: 2 },
  { round: 4, meeting_name: "Azerbaijan Grand Prix", circuit_short_name: "Baku", country_name: "Azerbaijan", month: 4, day: 30 },
  { round: 5, meeting_name: "Miami Grand Prix", circuit_short_name: "Miami", country_name: "United States", month: 5, day: 7 },
  { round: 6, meeting_name: "Monaco Grand Prix", circuit_short_name: "Monaco", country_name: "Monaco", month: 5, day: 28 },
  { round: 7, meeting_name: "Spanish Grand Prix", circuit_short_name: "Barcelona", country_name: "Spain", month: 6, day: 4 },
  { round: 8, meeting_name: "Canadian Grand Prix", circuit_short_name: "Montreal", country_name: "Canada", month: 6, day: 18 },
  { round: 9, meeting_name: "Austrian Grand Prix", circuit_short_name: "Spielberg", country_name: "Austria", month: 7, day: 2 },
  { round: 10, meeting_name: "British Grand Prix", circuit_short_name: "Silverstone", country_name: "United Kingdom", month: 7, day: 9 },
  { round: 11, meeting_name: "Hungarian Grand Prix", circuit_short_name: "Hungaroring", country_name: "Hungary", month: 7, day: 23 },
  { round: 12, meeting_name: "Belgian Grand Prix", circuit_short_name: "Spa-Francorchamps", country_name: "Belgium", month: 7, day: 30 },
  { round: 13, meeting_name: "Dutch Grand Prix", circuit_short_name: "Zandvoort", country_name: "Netherlands", month: 8, day: 27 },
  { round: 14, meeting_name: "Italian Grand Prix", circuit_short_name: "Monza", country_name: "Italy", month: 9, day: 3 },
  { round: 15, meeting_name: "Singapore Grand Prix", circuit_short_name: "Marina Bay", country_name: "Singapore", month: 9, day: 17 },
  { round: 16, meeting_name: "Japanese Grand Prix", circuit_short_name: "Suzuka", country_name: "Japan", month: 9, day: 24 },
  { round: 17, meeting_name: "Qatar Grand Prix", circuit_short_name: "Lusail", country_name: "Qatar", month: 10, day: 8 },
  { round: 18, meeting_name: "United States Grand Prix", circuit_short_name: "Austin", country_name: "United States", month: 10, day: 22 },
  { round: 19, meeting_name: "Mexico City Grand Prix", circuit_short_name: "Mexico City", country_name: "Mexico", month: 10, day: 29 },
  { round: 20, meeting_name: "São Paulo Grand Prix", circuit_short_name: "Interlagos", country_name: "Brazil", month: 11, day: 5 },
  { round: 21, meeting_name: "Las Vegas Grand Prix", circuit_short_name: "Las Vegas", country_name: "United States", month: 11, day: 18 },
  { round: 22, meeting_name: "Abu Dhabi Grand Prix", circuit_short_name: "Yas Marina", country_name: "United Arab Emirates", month: 11, day: 26 },
];

const POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

function iso(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T13:00:00.000Z`;
}

function sessionKey(year: number, round: number) {
  if (year === 2026 && round === 18) return SESSION_KEY;
  return year * 100 + round;
}

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

const ROSTER_2023: ArchiveDriver[] = [
  { driver_number: 1, code: "VER", full_name: "Max Verstappen", team_name: "Red Bull Racing", team_colour: "3671C6", pace: 1.00 },
  { driver_number: 11, code: "PER", full_name: "Sergio Perez", team_name: "Red Bull Racing", team_colour: "3671C6", pace: 0.78 },
  { driver_number: 16, code: "LEC", full_name: "Charles Leclerc", team_name: "Ferrari", team_colour: "E8002D", pace: 0.86 },
  { driver_number: 55, code: "SAI", full_name: "Carlos Sainz", team_name: "Ferrari", team_colour: "E8002D", pace: 0.84 },
  { driver_number: 44, code: "HAM", full_name: "Lewis Hamilton", team_name: "Mercedes", team_colour: "27F4D2", pace: 0.76 },
  { driver_number: 63, code: "RUS", full_name: "George Russell", team_name: "Mercedes", team_colour: "27F4D2", pace: 0.80 },
  { driver_number: 4, code: "NOR", full_name: "Lando Norris", team_name: "McLaren", team_colour: "FF8000", pace: 0.82 },
  { driver_number: 81, code: "PIA", full_name: "Oscar Piastri", team_name: "McLaren", team_colour: "FF8000", pace: 0.70 },
  { driver_number: 14, code: "ALO", full_name: "Fernando Alonso", team_name: "Aston Martin", team_colour: "229971", pace: 0.74 },
  { driver_number: 18, code: "STR", full_name: "Lance Stroll", team_name: "Aston Martin", team_colour: "229971", pace: 0.50 },
  { driver_number: 10, code: "GAS", full_name: "Pierre Gasly", team_name: "Alpine", team_colour: "FF87BC", pace: 0.54 },
  { driver_number: 31, code: "OCO", full_name: "Esteban Ocon", team_name: "Alpine", team_colour: "FF87BC", pace: 0.52 },
  { driver_number: 23, code: "ALB", full_name: "Alexander Albon", team_name: "Williams", team_colour: "64C4FF", pace: 0.48 },
  { driver_number: 2, code: "SAR", full_name: "Logan Sargeant", team_name: "Williams", team_colour: "64C4FF", pace: 0.28 },
  { driver_number: 22, code: "TSU", full_name: "Yuki Tsunoda", team_name: "AlphaTauri", team_colour: "5E8FAA", pace: 0.50 },
  { driver_number: 3, code: "RIC", full_name: "Daniel Ricciardo", team_name: "AlphaTauri", team_colour: "5E8FAA", pace: 0.46 },
  { driver_number: 77, code: "BOT", full_name: "Valtteri Bottas", team_name: "Alfa Romeo", team_colour: "C92D4B", pace: 0.40 },
  { driver_number: 24, code: "ZHO", full_name: "Zhou Guanyu", team_name: "Alfa Romeo", team_colour: "C92D4B", pace: 0.34 },
  { driver_number: 20, code: "MAG", full_name: "Kevin Magnussen", team_name: "Haas", team_colour: "B6BABD", pace: 0.42 },
  { driver_number: 27, code: "HUL", full_name: "Nico Hulkenberg", team_name: "Haas", team_colour: "B6BABD", pace: 0.44 },
];

const ROSTER_2024: ArchiveDriver[] = [
  { driver_number: 1, code: "VER", full_name: "Max Verstappen", team_name: "Red Bull Racing", team_colour: "3671C6", pace: 1.00 },
  { driver_number: 11, code: "PER", full_name: "Sergio Perez", team_name: "Red Bull Racing", team_colour: "3671C6", pace: 0.72 },
  { driver_number: 4, code: "NOR", full_name: "Lando Norris", team_name: "McLaren", team_colour: "FF8000", pace: 0.94 },
  { driver_number: 81, code: "PIA", full_name: "Oscar Piastri", team_name: "McLaren", team_colour: "FF8000", pace: 0.88 },
  { driver_number: 16, code: "LEC", full_name: "Charles Leclerc", team_name: "Ferrari", team_colour: "E8002D", pace: 0.90 },
  { driver_number: 55, code: "SAI", full_name: "Carlos Sainz", team_name: "Ferrari", team_colour: "E8002D", pace: 0.84 },
  { driver_number: 44, code: "HAM", full_name: "Lewis Hamilton", team_name: "Mercedes", team_colour: "27F4D2", pace: 0.78 },
  { driver_number: 63, code: "RUS", full_name: "George Russell", team_name: "Mercedes", team_colour: "27F4D2", pace: 0.80 },
  { driver_number: 14, code: "ALO", full_name: "Fernando Alonso", team_name: "Aston Martin", team_colour: "229971", pace: 0.66 },
  { driver_number: 18, code: "STR", full_name: "Lance Stroll", team_name: "Aston Martin", team_colour: "229971", pace: 0.48 },
  { driver_number: 10, code: "GAS", full_name: "Pierre Gasly", team_name: "Alpine", team_colour: "FF87BC", pace: 0.52 },
  { driver_number: 31, code: "OCO", full_name: "Esteban Ocon", team_name: "Alpine", team_colour: "FF87BC", pace: 0.50 },
  { driver_number: 23, code: "ALB", full_name: "Alexander Albon", team_name: "Williams", team_colour: "64C4FF", pace: 0.58 },
  { driver_number: 2, code: "SAR", full_name: "Logan Sargeant", team_name: "Williams", team_colour: "64C4FF", pace: 0.32 },
  { driver_number: 22, code: "TSU", full_name: "Yuki Tsunoda", team_name: "RB", team_colour: "6692FF", pace: 0.54 },
  { driver_number: 3, code: "RIC", full_name: "Daniel Ricciardo", team_name: "RB", team_colour: "6692FF", pace: 0.46 },
  { driver_number: 77, code: "BOT", full_name: "Valtteri Bottas", team_name: "Kick Sauber", team_colour: "52E252", pace: 0.38 },
  { driver_number: 24, code: "ZHO", full_name: "Zhou Guanyu", team_name: "Kick Sauber", team_colour: "52E252", pace: 0.34 },
  { driver_number: 20, code: "MAG", full_name: "Kevin Magnussen", team_name: "Haas", team_colour: "B6BABD", pace: 0.42 },
  { driver_number: 27, code: "HUL", full_name: "Nico Hulkenberg", team_name: "Haas", team_colour: "B6BABD", pace: 0.50 },
];

const ROSTER_2025: ArchiveDriver[] = [
  { driver_number: 1, code: "VER", full_name: "Max Verstappen", team_name: "Red Bull Racing", team_colour: "3671C6", pace: 0.93 },
  { driver_number: 22, code: "TSU", full_name: "Yuki Tsunoda", team_name: "Red Bull Racing", team_colour: "3671C6", pace: 0.62 },
  { driver_number: 4, code: "NOR", full_name: "Lando Norris", team_name: "McLaren", team_colour: "FF8000", pace: 1.00 },
  { driver_number: 81, code: "PIA", full_name: "Oscar Piastri", team_name: "McLaren", team_colour: "FF8000", pace: 0.95 },
  { driver_number: 16, code: "LEC", full_name: "Charles Leclerc", team_name: "Ferrari", team_colour: "E8002D", pace: 0.88 },
  { driver_number: 44, code: "HAM", full_name: "Lewis Hamilton", team_name: "Ferrari", team_colour: "E8002D", pace: 0.84 },
  { driver_number: 63, code: "RUS", full_name: "George Russell", team_name: "Mercedes", team_colour: "27F4D2", pace: 0.82 },
  { driver_number: 12, code: "ANT", full_name: "Kimi Antonelli", team_name: "Mercedes", team_colour: "27F4D2", pace: 0.70 },
  { driver_number: 14, code: "ALO", full_name: "Fernando Alonso", team_name: "Aston Martin", team_colour: "229971", pace: 0.60 },
  { driver_number: 18, code: "STR", full_name: "Lance Stroll", team_name: "Aston Martin", team_colour: "229971", pace: 0.46 },
  { driver_number: 10, code: "GAS", full_name: "Pierre Gasly", team_name: "Alpine", team_colour: "0093C7", pace: 0.52 },
  { driver_number: 43, code: "COL", full_name: "Franco Colapinto", team_name: "Alpine", team_colour: "0093C7", pace: 0.44 },
  { driver_number: 23, code: "ALB", full_name: "Alexander Albon", team_name: "Williams", team_colour: "64C4FF", pace: 0.64 },
  { driver_number: 55, code: "SAI", full_name: "Carlos Sainz", team_name: "Williams", team_colour: "64C4FF", pace: 0.68 },
  { driver_number: 30, code: "LAW", full_name: "Liam Lawson", team_name: "Racing Bulls", team_colour: "6692FF", pace: 0.56 },
  { driver_number: 6, code: "HAD", full_name: "Isack Hadjar", team_name: "Racing Bulls", team_colour: "6692FF", pace: 0.54 },
  { driver_number: 31, code: "OCO", full_name: "Esteban Ocon", team_name: "Haas", team_colour: "B6BABD", pace: 0.50 },
  { driver_number: 87, code: "BEA", full_name: "Oliver Bearman", team_name: "Haas", team_colour: "B6BABD", pace: 0.48 },
  { driver_number: 27, code: "HUL", full_name: "Nico Hulkenberg", team_name: "Kick Sauber", team_colour: "52E252", pace: 0.50 },
  { driver_number: 5, code: "BOR", full_name: "Gabriel Bortoleto", team_name: "Kick Sauber", team_colour: "52E252", pace: 0.42 },
];

const ROSTER_2026 = ROSTER_2025;

const WINNERS: Record<number, number[]> = {
  2023: [1, 11, 1, 11, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 55, 1, 1, 1, 1, 1, 1, 1],
  2024: [1, 1, 55, 1, 1, 4, 1, 16, 1, 1, 63, 44, 81, 44, 4, 16, 81, 4, 16, 1, 1, 44, 1, 4],
  2025: [4, 1, 81, 4, 16, 4, 1, 4, 81, 44, 4, 63, 81, 4, 1, 16, 81, 4, 1, 4, 81, 44, 4, 4],
  2026: [1, 4, 81, 1, 4, 16, 4, 1, 81, 4, 44, 1, 81, 4, 16, 1, 4],
};

function rosterFor(year: number) {
  if (year === 2023) return ROSTER_2023;
  if (year === 2024) return ROSTER_2024;
  return year === 2025 ? ROSTER_2025 : ROSTER_2026;
}

function tracksFor(year: number) {
  return year === 2023 ? TRACKS_2023 : TRACKS;
}

function classify(year: number, round: number, winner: number): RaceResultRow[] {
  const roster = rosterFor(year);
  const rng = mulberry32(year * 97 + round * 13);
  const ranked = roster
    .map((d) => ({
      d,
      score: d.pace * 10 + rng() * 2.4 + (d.driver_number === winner ? 8 : 0),
    }))
    .sort((a, b) => b.score - a.score);
  const wi = ranked.findIndex((r) => r.d.driver_number === winner);
  if (wi > 0) {
    const [w] = ranked.splice(wi, 1);
    if (w) ranked.unshift(w);
  }
  const dnfCount = rng() < 0.45 ? 1 : rng() < 0.2 ? 2 : 0;
  const totalLaps = 50 + (round % 12);
  return ranked.map((row, i) => {
    const dnf = i >= ranked.length - dnfCount && i !== 0;
    const pos = i + 1;
    const gap = pos === 1 || dnf ? null : Math.round((1.1 * i + rng() * 2.8 + i * i * 0.04) * 1000) / 1000;
    const pts = dnf ? 0 : (POINTS[i] ?? 0);
    return {
      position: pos,
      driver_number: row.d.driver_number,
      full_name: row.d.full_name,
      team_name: row.d.team_name,
      team_colour: row.d.team_colour,
      code: row.d.code,
      gap_to_leader: gap,
      points: pts,
      status: (dnf ? "DNF" : "Classified") as RaceResultRow["status"],
      laps: dnf ? 8 + Math.floor(rng() * (totalLaps - 12)) : totalLaps,
      fastest_lap: false,
    };
  }).map((row, _, all) => {
    const classified = all.filter((r) => r.status === "Classified");
    const flCandidate = classified.slice(0, 10).sort((a, b) => a.position - b.position)[Math.min(2, classified.length - 1)];
    return {
      ...row,
      fastest_lap: flCandidate?.driver_number === row.driver_number,
      points: row.points + (flCandidate?.driver_number === row.driver_number && row.status === "Classified" && row.position <= 10 ? 1 : 0),
    };
  });
}

type BuiltMeeting = MeetingRow & { results: RaceResultRow[] };

function meetingStatus(year: number, round: number): MeetingRow["status"] {
  if (year < 2026) return "complete";
  if (round < 18) return "complete";
  if (round === 18) return "live";
  return "upcoming";
}

function buildYear(year: number): BuiltMeeting[] {
  const winners = WINNERS[year] ?? [];
  return tracksFor(year).map((t) => {
    const status = meetingStatus(year, t.round);
    const key = sessionKey(year, t.round);
    const winnerNo = status === "complete" ? winners[t.round - 1] : undefined;
    const results = winnerNo != null ? classify(year, t.round, winnerNo) : [];
    const win = results[0];
    return {
      year,
      round: t.round,
      meeting_key: year * 100 + t.round,
      session_key: key,
      meeting_name: t.meeting_name,
      circuit_short_name: t.circuit_short_name,
      country_name: t.country_name,
      date_start: iso(year, t.month, t.day),
      status,
      winner_name: win?.full_name ?? null,
      winner_number: win?.driver_number ?? null,
      winner_team: win?.team_name ?? null,
      results,
    };
  });
}

const YEARS = [2026, 2025, 2024, 2023] as const;
const BUILT: Record<number, BuiltMeeting[]> = {
  2023: buildYear(2023),
  2024: buildYear(2024),
  2025: buildYear(2025),
  2026: buildYear(2026),
};

function bySession() {
  const m = new Map<number, BuiltMeeting>();
  for (const year of YEARS) {
    for (const meet of BUILT[year] ?? []) m.set(meet.session_key, meet);
  }
  return m;
}

const SESSION_INDEX = bySession();

export function Get_Seasons(): SeasonRow[] {
  return YEARS.map((year) => {
    const meets = BUILT[year] ?? [];
    return {
      year,
      name: `${year} Formula 1 World Championship`,
      status: year === 2026 ? "in_progress" : "complete",
      meeting_count: meets.length,
    };
  });
}

export function Get_Season_Meetings(year: number): MeetingRow[] {
  return (BUILT[year] ?? []).map(({ results: _r, ...m }) => m);
}

export function Get_Race_Result(session_key: number): RaceResultRow[] {
  return SESSION_INDEX.get(session_key)?.results ?? [];
}

export function Get_Meeting(session_key: number): MeetingRow | undefined {
  const m = SESSION_INDEX.get(session_key);
  if (!m) return undefined;
  const { results: _r, ...rest } = m;
  return rest;
}

export function Get_Season_Drivers(year: number): DriverListRow[] {
  return rosterFor(year).map((d) => ({
    driver_number: d.driver_number,
    full_name: d.full_name,
    team_name: d.team_name,
    team_colour: d.team_colour,
    headshot_url: "",
    code: d.code,
  }));
}

export function Get_Driver_Standings(year: number): DriverStandingRow[] {
  const meets = (BUILT[year] ?? []).filter((m) => m.status === "complete");
  const bag = new Map<number, DriverStandingRow>();
  for (const d of rosterFor(year)) {
    bag.set(d.driver_number, {
      position: 0,
      driver_number: d.driver_number,
      full_name: d.full_name,
      team_name: d.team_name,
      team_colour: d.team_colour,
      code: d.code,
      points: 0,
      wins: 0,
      podiums: 0,
    });
  }
  for (const meet of meets) {
    for (const row of meet.results) {
      const s = bag.get(row.driver_number);
      if (!s) continue;
      s.points += row.points;
      if (row.position === 1 && row.status === "Classified") s.wins += 1;
      if (row.position <= 3 && row.status === "Classified") s.podiums += 1;
    }
  }
  return [...bag.values()]
    .sort((a, b) => b.points - a.points || b.wins - a.wins)
    .map((s, i) => ({ ...s, position: i + 1 }));
}

export function Get_Constructor_Standings(year: number): ConstructorStandingRow[] {
  const drivers = Get_Driver_Standings(year);
  const bag = new Map<string, ConstructorStandingRow>();
  for (const d of drivers) {
    const cur = bag.get(d.team_name) ?? {
      position: 0,
      team_name: d.team_name,
      team_colour: d.team_colour,
      points: 0,
      wins: 0,
    };
    cur.points += d.points;
    cur.wins += d.wins;
    bag.set(d.team_name, cur);
  }
  return [...bag.values()]
    .sort((a, b) => b.points - a.points || b.wins - a.wins)
    .map((s, i) => ({ ...s, position: i + 1 }));
}

export function isLiveSession(session_key: number) {
  return session_key === SESSION_KEY;
}

export function hasTimingFeed(session_key: number) {
  const m = SESSION_INDEX.get(session_key);
  return Boolean(m && m.status !== "upcoming");
}

export { sessionKey };
