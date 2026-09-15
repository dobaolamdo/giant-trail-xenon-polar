import {
  Get_Meeting,
  Get_Race_Result,
  hasTimingFeed as meetingHasTiming,
} from "./archive";
import {
  RACE,
  SESSION_KEY,
  buildRace,
  type DriverDef,
  type RaceFeed,
} from "./simulate";

const cache = new Map<number, RaceFeed>([[SESSION_KEY, RACE]]);

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

function driversFromResult(session_key: number): { drivers: DriverDef[]; totalLaps: number } | null {
  const results = Get_Race_Result(session_key);
  if (!results.length) return null;
  const classified = results.find((r) => r.status === "Classified");
  const totalLaps = Math.max(48, Math.min(62, classified?.laps ?? 52));
  const rng = mulberry32(session_key * 17);
  const drivers: DriverDef[] = results.map((r, i) => {
    const pit1 = 11 + ((i * 3 + Math.floor(rng() * 5)) % 10);
    const twoStop = i % 4 === 0 || r.status === "DNF";
    const pit2 = Math.min(totalLaps - 3, pit1 + 18 + (i % 6));
    return {
      driver_number: r.driver_number,
      code: r.code,
      full_name: r.full_name,
      team_name: r.team_name,
      team_colour: r.team_colour,
      grid: ((i * 7 + session_key) % results.length) + 1,
      pace: 0.992 + i * 0.00082,
      consistency: 0.12 + (i % 6) * 0.02,
      pitLaps: twoStop ? [pit1, pit2] : [pit1],
      compounds: twoStop ? ["SOFT", "HARD", "SOFT"] : ["MEDIUM", "HARD"],
      dnfLap: r.status === "DNF" ? Math.max(8, Math.min(r.laps, totalLaps - 2)) : undefined,
    };
  });
  return { drivers, totalLaps };
}

/** Live Singapore feed, or a generated replay for any completed archive race. */
export function getFeed(session_key: number): RaceFeed | null {
  const hit = cache.get(session_key);
  if (hit) return hit;
  if (!meetingHasTiming(session_key)) return null;
  const meeting = Get_Meeting(session_key);
  if (!meeting) return null;
  const built = driversFromResult(session_key);
  if (!built) return null;
  const feed = buildRace({
    seed: session_key,
    drivers: built.drivers,
    meeting_name: meeting.meeting_name,
    circuit_short_name: meeting.circuit_short_name,
    country_name: meeting.country_name,
    date_start: meeting.date_start,
    winner_name: meeting.winner_name?.split(" ").pop(),
    totalLaps: built.totalLaps,
  });
  cache.set(session_key, feed);
  return feed;
}

export function hasTimingFeed(session_key: number) {
  return meetingHasTiming(session_key);
}
