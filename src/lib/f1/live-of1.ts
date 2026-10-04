/** OpenF1 poll + fallback Baku Race 11377 khi API lock. */
import { BAKU_RACE_KEY, bakuFallbackBoard, bakuFallbackDrivers } from "./baku-fallback";
import {
  rankFromLaps,
  rankFromSessionResult,
  type RankedRow,
  type RankDriverMeta,
  type SessionResultRow,
} from "./rank";

export type LiveRawLap = {
  driver_number: number;
  lap_number: number;
  lap_duration: number | string | null;
  duration_sector_1?: number | string | null;
  duration_sector_2?: number | string | null;
  duration_sector_3?: number | string | null;
};

export type LiveDriverMeta = RankDriverMeta;

export type LivePullResult = {
  locked: boolean;
  status: string;
  drivers?: Map<number, LiveDriverMeta>;
  laps?: LiveRawLap[];
  maxLap?: number;
  board?: RankedRow[];
  weather?: {
    air_temperature: number;
    track_temperature: number;
    humidity: number;
    wind_speed: number;
    rainfall: number;
  };
  control?: any[];
  pits?: any[];
  results?: SessionResultRow[];
};

const OF1 = "https://api.openf1.org/v1";

function isRestricted(data: unknown): string | null {
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const d = data as { detail?: string };
    if (
      d.detail &&
      /restrict|auth|sponsor|sign up|session in progress|live f1/i.test(
        String(d.detail),
      )
    ) {
      return String(d.detail);
    }
  }
  return null;
}

function bakuOffline(): LivePullResult {
  return {
    locked: false,
    status: "Baku 2026 Race · kết quả (offline cache)",
    drivers: bakuFallbackDrivers(),
    board: bakuFallbackBoard(),
    maxLap: 51,
  };
}

export async function pullLiveOf1(sessionKey: number): Promise<LivePullResult> {
  try {
    const dRes = await fetch(`${OF1}/drivers?session_key=${sessionKey}`);
    const dData = await dRes.json();
    const lock = isRestricted(dData);
    if (lock) {
      if (sessionKey === BAKU_RACE_KEY) return bakuOffline();
      return {
        locked: true,
        status: "OpenF1 đang khóa (có session live) — thử lại sau khi session kết thúc",
      };
    }

    const drivers = new Map<number, LiveDriverMeta>();
    if (Array.isArray(dData)) {
      for (const r of dData) {
        const num = Number(r.driver_number);
        if (!num) continue;
        drivers.set(num, {
          full_name: String(r.full_name ?? r.broadcast_name ?? `#${num}`),
          team_name: String(r.team_name ?? ""),
          team_colour: String(r.team_colour ?? "888888").replace(/^#/, ""),
          code: r.name_acronym != null ? String(r.name_acronym) : undefined,
        });
      }
    }

    const [lRes, resRes] = await Promise.all([
      fetch(`${OF1}/laps?session_key=${sessionKey}`),
      fetch(`${OF1}/session_result?session_key=${sessionKey}`),
    ]);
    const lData = await lRes.json();
    const resData = await resRes.json();

    if (isRestricted(lData) || isRestricted(resData)) {
      if (sessionKey === BAKU_RACE_KEY) return bakuOffline();
      return {
        locked: true,
        status: "OpenF1 đang khóa — thử lại sau",
        drivers,
      };
    }

    let laps: LiveRawLap[] = [];
    let maxLap = 0;
    if (Array.isArray(lData)) {
      laps = lData
        .filter((r: any) => r.driver_number != null && r.lap_number != null)
        .map((r: any) => ({
          driver_number: Number(r.driver_number),
          lap_number: Number(r.lap_number),
          lap_duration: r.lap_duration,
          duration_sector_1: r.duration_sector_1,
          duration_sector_2: r.duration_sector_2,
          duration_sector_3: r.duration_sector_3,
        }));
      maxLap = laps.reduce((a, l) => Math.max(a, l.lap_number), 0);
    } else if (
      lData &&
      typeof lData === "object" &&
      /no results/i.test(String((lData as any).detail ?? ""))
    ) {
      if (sessionKey === BAKU_RACE_KEY) return bakuOffline();
      return { locked: false, status: "Waiting for first lap…", drivers };
    }

    const results: SessionResultRow[] = Array.isArray(resData)
      ? resData
          .filter((r: any) => r.driver_number != null)
          .map((r: any) => ({
            position: r.position != null ? Number(r.position) : null,
            driver_number: Number(r.driver_number),
            number_of_laps:
              r.number_of_laps != null ? Number(r.number_of_laps) : null,
            points: r.points != null ? Number(r.points) : null,
            dnf: Boolean(r.dnf),
            dns: Boolean(r.dns),
            dsq: Boolean(r.dsq),
            duration: r.duration != null ? Number(r.duration) : null,
            gap_to_leader: r.gap_to_leader,
          }))
      : [];

    const dnfDrivers = new Set<number>();
    for (const r of results) {
      if (r.dnf || r.dns || r.dsq || r.position == null) {
        dnfDrivers.add(r.driver_number);
      }
    }

    const hasOfficial = results.some((r) => r.position != null && !r.dnf);
    let board =
      hasOfficial
        ? rankFromSessionResult(results, drivers)
        : rankFromLaps(laps, drivers, { maxLap, dnfDrivers });

    if (board.length === 0 && sessionKey === BAKU_RACE_KEY) {
      return bakuOffline();
    }

    let weather: LivePullResult["weather"];
    try {
      const wRes = await fetch(`${OF1}/weather?session_key=${sessionKey}`);
      const wData = await wRes.json();
      if (Array.isArray(wData) && wData.length > 0) {
        const mid = wData[wData.length - 1]!;
        weather = {
          air_temperature: Number(mid.air_temperature) || 0,
          track_temperature: Number(mid.track_temperature) || 0,
          humidity: Number(mid.humidity) || 0,
          wind_speed: Number(mid.wind_speed) || 0,
          rainfall: Number(mid.rainfall) || 0,
        };
      }
    } catch {
      /* optional */
    }

    return {
      locked: false,
      status: hasOfficial
        ? `Result · ${maxLap || 51} laps`
        : maxLap > 0
          ? `LIVE · lap ${maxLap}`
          : "Waiting for first lap…",
      drivers,
      laps,
      maxLap: maxLap || (hasOfficial ? 51 : 0),
      board,
      weather,
      results,
    };
  } catch {
    if (sessionKey === BAKU_RACE_KEY) return bakuOffline();
    return { locked: false, status: "Poll error — retrying…" };
  }
}
