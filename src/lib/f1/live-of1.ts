/** Live OpenF1 poll for Baku race (session 11377) and similar live keys. */
export type LiveRawLap = {
  driver_number: number;
  lap_number: number;
  lap_duration: number | string | null;
  duration_sector_1?: number | string | null;
  duration_sector_2?: number | string | null;
  duration_sector_3?: number | string | null;
  is_purple_s1?: number | boolean;
  is_purple_s2?: number | boolean;
  is_purple_s3?: number | boolean;
};

export type LiveDriverMeta = {
  full_name: string;
  team_name: string;
  team_colour: string;
  code?: string;
};

export type LivePullResult = {
  locked: boolean;
  status: string;
  drivers?: Map<number, LiveDriverMeta>;
  laps?: LiveRawLap[];
  maxLap?: number;
  weather?: {
    air_temperature: number;
    track_temperature: number;
    humidity: number;
    wind_speed: number;
    rainfall: number;
  };
  control?: any[];
  pits?: any[];
};

const OF1 = "https://api.openf1.org/v1";

function isRestricted(data: unknown): string | null {
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const d = data as { detail?: string };
    if (d.detail && /restrict|auth|sponsor|sign up|session in progress/i.test(String(d.detail))) {
      return String(d.detail);
    }
  }
  return null;
}

export async function pullLiveOf1(sessionKey: number): Promise<LivePullResult> {
  try {
    const dRes = await fetch(`${OF1}/drivers?session_key=${sessionKey}`);
    const dData = await dRes.json();
    const lock = isRestricted(dData);
    if (lock) {
      return { locked: true, status: "Live locked — OpenF1 sponsor required during session" };
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

    const lRes = await fetch(`${OF1}/laps?session_key=${sessionKey}`);
    const lData = await lRes.json();
    const lock2 = isRestricted(lData);
    if (lock2) {
      return { locked: true, status: "Live locked — OpenF1 sponsor required during session", drivers };
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
          is_purple_s1: r.is_purple_s1,
          is_purple_s2: r.is_purple_s2,
          is_purple_s3: r.is_purple_s3,
        }));
      maxLap = laps.reduce((a, l) => Math.max(a, l.lap_number), 0);
    } else if (lData && typeof lData === "object" && /no results/i.test(String((lData as any).detail ?? ""))) {
      return { locked: false, status: "Waiting for first lap…", drivers };
    }

    let weather: LivePullResult["weather"];
    let control: any[] | undefined;
    let pits: any[] | undefined;
    try {
      const [wRes, rcRes, pitRes] = await Promise.all([
        fetch(`${OF1}/weather?session_key=${sessionKey}`),
        fetch(`${OF1}/race_control?session_key=${sessionKey}`),
        fetch(`${OF1}/pit?session_key=${sessionKey}`),
      ]);
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
      const rcData = await rcRes.json();
      if (Array.isArray(rcData)) {
        control = rcData.map((r: any) => ({
          date: String(r.date ?? ""),
          category: String(r.category ?? ""),
          flag: String(r.flag ?? r.category ?? ""),
          scope: String(r.scope ?? ""),
          driver_number: r.driver_number != null ? Number(r.driver_number) : null,
          message: String(r.message ?? ""),
          lap_number: r.lap_number != null ? Number(r.lap_number) : null,
        }));
      }
      const pitData = await pitRes.json();
      if (Array.isArray(pitData)) {
        pits = pitData
          .filter((r: any) => r.driver_number != null)
          .map((r: any) => {
            const num = Number(r.driver_number);
            const dm = drivers.get(num);
            return {
              driver_number: num,
              full_name: dm?.full_name ?? `#${num}`,
              lap_number: Number(r.lap_number) || 0,
              stop_duration: Number(r.stop_duration ?? r.pit_duration) || 0,
              lane_duration: Number(r.lane_duration ?? r.pit_duration) || 0,
            };
          });
      }
    } catch {}

    return {
      locked: false,
      status: maxLap > 0 ? `LIVE · lap ${maxLap}` : "Waiting for first lap…",
      drivers,
      laps,
      maxLap,
      weather,
      control,
      pits,
    };
  } catch {
    return { locked: false, status: "Poll error — retrying…" };
  }
}
