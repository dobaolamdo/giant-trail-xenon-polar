import type { LeaderboardRow, LapHistoryRow } from "@/lib/f1/types";

export type Stint = {
  driver_number: number;
  lap_start: number;
  lap_end: number | null;
  compound: string;
};

export type Pit = {
  driver_number: number;
  lap_number: number;
  pit_duration: number | null;
  stop_duration: number | null;
  lane_duration: number | null;
};

function normCompound(c: unknown): string {
  const s = String(c ?? "")
    .trim()
    .toUpperCase();
  if (s === "SOFT" || s === "MEDIUM" || s === "HARD") return s;
  if (s === "INTERMEDIATE" || s === "INTER") return "INTERMEDIATE";
  if (s === "WET" || s === "FULL_WET") return "WET";
  return s || "MEDIUM";
}

export function parseStints(data: unknown): Stint[] {
  if (!Array.isArray(data)) return [];
  return data
    .filter((r: any) => r?.driver_number != null && r?.lap_start != null)
    .map((r: any) => ({
      driver_number: Number(r.driver_number),
      lap_start: Number(r.lap_start),
      lap_end: r.lap_end != null ? Number(r.lap_end) : null,
      compound: normCompound(r.compound),
    }));
}

export function parsePits(data: unknown): Pit[] {
  if (!Array.isArray(data)) return [];
  return data
    .filter((r: any) => r?.driver_number != null && r?.lap_number != null)
    .map((r: any) => ({
      driver_number: Number(r.driver_number),
      lap_number: Number(r.lap_number),
      pit_duration:
        r.pit_duration != null && r.pit_duration !== ""
          ? Number(r.pit_duration)
          : null,
      stop_duration:
        r.stop_duration != null && r.stop_duration !== ""
          ? Number(r.stop_duration)
          : null,
      lane_duration:
        r.lane_duration != null && r.lane_duration !== ""
          ? Number(r.lane_duration)
          : null,
    }));
}

/** Compound on a given lap (stint covering that lap). */
export function compoundAt(
  stints: Stint[],
  driver: number,
  lap: number,
): string {
  const mine = stints.filter((s) => s.driver_number === driver);
  for (const s of mine) {
    const end = s.lap_end ?? 9999;
    if (lap >= s.lap_start && lap <= end) return s.compound;
  }
  let best: Stint | null = null;
  for (const s of mine) {
    if (s.lap_start <= lap && (!best || s.lap_start > best.lap_start)) best = s;
  }
  return best?.compound ?? "MEDIUM";
}

export function pitOnLap(
  pits: Pit[],
  driver: number,
  lap: number,
): Pit | undefined {
  return pits.find((p) => p.driver_number === driver && p.lap_number === lap);
}

export function applyTyreAndPit(
  rows: LeaderboardRow[],
  stints: Stint[],
  pits: Pit[],
  currentLap: number,
): LeaderboardRow[] {
  return rows.map((r) => {
    const pit = pitOnLap(pits, r.driver_number, currentLap);
    const compound = compoundAt(stints, r.driver_number, currentLap);
    return {
      ...r,
      compound,
      status: pit ? "PIT" : r.status === "DNF" ? "DNF" : r.status,
      last_lap: pit
        ? (pit.stop_duration ?? pit.pit_duration ?? r.last_lap)
        : r.last_lap,
    };
  });
}

export function applyLapCompounds(
  laps: LapHistoryRow[],
  stints: Stint[],
  pits: Pit[],
  driver: number,
): LapHistoryRow[] {
  return laps.map((l) => {
    const pit = pitOnLap(pits, driver, l.lap_number);
    return {
      ...l,
      compound: compoundAt(stints, driver, l.lap_number),
      is_pit_out_lap: Boolean(pit),
    };
  });
}
